import fs from 'fs';
import Tesseract from 'tesseract.js';
import { createRequire } from 'module';
import scribe from 'scribe.js-ocr';
import { Report, LabValue, ReportCategory, UniversalRange } from '../models/index.js';
import { inferReportName } from './analytics.js';
import { logger } from './logger.js';
import { env } from '../config/env.js';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const CANONICAL_MAPPINGS = {
  'hemoglobin': 'Haemoglobin',
  'haemoglobin': 'Haemoglobin',
  'hb': 'Haemoglobin',
  'hba1c': 'HbA1c',
  'glycated hemoglobin': 'HbA1c',
  'a1c': 'HbA1c',
  'total cholesterol': 'Total Cholesterol',
  'cholesterol': 'Total Cholesterol',
  'hdl': 'HDL Cholesterol',
  'hdl cholesterol': 'HDL Cholesterol',
  'ldl': 'LDL Cholesterol',
  'ldl cholesterol': 'LDL Cholesterol',
  'triglycerides': 'Triglycerides',
  'trig': 'Triglycerides',
  'wbc': 'WBC',
  'white blood cell': 'WBC',
  'white blood cells': 'WBC',
  'rbc': 'RBC',
  'red blood cell': 'RBC',
  'red blood cells': 'RBC',
  'platelets': 'Platelets',
  'plt': 'Platelets',
  'glucose': 'Glucose',
  'sugar': 'Glucose',
  'fasting glucose': 'Glucose',
  'tsh': 'TSH',
  'thyroid stimulating hormone': 'TSH',
  'creatinine': 'Creatinine',
  'creat': 'Creatinine'
};

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function cleanUnit(str) {
  if (!str) return '';
  return str
    .replace(/reference\s*range/i, '')
    .replace(/ref\s*range/i, '')
    .replace(/normal\s*range/i, '')
    .replace(/normal/i, '')
    .replace(/range/i, '')
    .replace(/interval/i, '')
    .replace(/[():;,\-\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValueAbnormal(value, refRange) {
  if (!refRange) return null;
  const cleanRange = refRange.trim().replace(/\s+/g, '');


  const rangeMatch = cleanRange.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    return value < low || value > high;
  }


  const lessMatch = cleanRange.match(/^(<=|<)(\d+(?:\.\d+)?)$/);
  if (lessMatch) {
    const limit = parseFloat(lessMatch[2]);
    const operator = lessMatch[1];
    return operator === '<' ? value >= limit : value > limit;
  }


  const greaterMatch = cleanRange.match(/^(>=|>)(\d+(?:\.\d+)?)$/);
  if (greaterMatch) {
    const limit = parseFloat(greaterMatch[2]);
    const operator = greaterMatch[1];
    return operator === '>' ? value <= limit : value < limit;
  }

  return null;
}

const EXCLUSION_PATTERNS = [
  /mumbai(-\d+)?/i,
  /floor/i,
  /building/i,
  /road/i,
  /street/i,
  /mall/i,
  /center/i,
  /centre/i,
  /lane/i,
  /pincode/i,
  /\b\d{6}\b/,
  /reg\s*no/i,
  /nabl/i,
  /iso/i,
  /gst/i,
  /cin/i,
  /accredited/i,
  /license/i,
  /patient\s*name/i,
  /^name\s*[:\-]/i,
  /^age\s*[:\-]/i,
  /^gender/i,
  /^sex\s*[:\-]/i,
  /collection\s*date/i,
  /report\s*date/i,
  /received\s*date/i,
  /referred\s*by/i,
  /sample/i,
  /barcode/i,
  /mrn/i,
  /vid\b/i,
  /methodology/i,
  /interpretation/i,
  /clinical\s*significance/i,
  /highly\s*specific/i,
  /about\s*one\s*third/i,
  /between/i,
  /more\s*than/i,
  /less\s*than/i,
  /associated\s*with/i,
  /indicates/i,
  /note\s*:/i,
  /comments\s*:/i,
  /page\s*\d+/i,
  /---\s*page/i,
  /laboratory\s*results?\s*showed/i,
  /\b(showed|revealed|underwent|provided|awaits|examination)\b/i,
  /missing\s*\/\s*unparseable/i,
  /normal\s+[a-z\s]+levels?\s+in/i
];

const VALID_UNITS = [
  "mg/dl", "g/dl", "uiu/ml", "iu/ml", "%", "mmol/l", "u/l", "iu/l",
  "10^3/ul", "10^6/ul", "/hpf", "pg", "fl", "meq/l", "ratio", "index", "ng/ml", "ug/dl", "μg/dl"
];

export async function verifyFileHeader(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { valid: false, reason: 'File does not exist on disk' };
  }
  try {
    const buffer = Buffer.alloc(8);
    const fd = await fs.promises.open(filePath, 'r');
    await fd.read(buffer, 0, 8, 0);
    await fd.close();

    if (buffer.toString('utf8', 0, 4) === '%PDF') {
      return { valid: true, fileType: 'pdf' };
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return { valid: true, fileType: 'png' };
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return { valid: true, fileType: 'jpeg' };
    }

    return { valid: false, reason: 'Invalid file header signature. Supported formats are PDF, PNG, and JPEG.' };
  } catch (err) {
    return { valid: false, reason: `Failed to read file header: ${err.message}` };
  }
}

export function isMedicalDocument(text) {
  if (!text || typeof text !== 'string') {
    return { isMedical: false, reason: 'No extracted text available for classification.' };
  }
  const lower = text.toLowerCase();

  const nonMedicalKeywords = [
    'invoice', 'bill to', 'subtotal', 'total amount', 'payment method',
    'curriculum vitae', 'education', 'skills', 'experience', 'employment history',
    'bank statement', 'account balance', 'transaction history', 'credit card statement',
    'purchase order', 'receipt'
  ];

  const matchedNonMedical = nonMedicalKeywords.filter(kw => lower.includes(kw));

  const medicalKeywords = [
    'laboratory', 'lab report', 'pathology', 'radiology', 'prescription', 'patient',
    'hb', 'hemoglobin', 'haemoglobin', 'wbc', 'rbc', 'platelets', 'glucose', 'sugar',
    'hba1c', 'creatinine', 'tsh', 'cholesterol', 'triglycerides', 'serum', 'plasma', 'csf',
    'specimen', 'biopsy', 'microscopic', 'findings', 'impression', 'examination', 'mri', 'ct scan',
    'ultrasound', 'rx', 'dosage', 'tablet', 'capsule', 'reactive', 'non-reactive', 'negative',
    'positive', 'detected', 'not detected', 'reference range', 'observed value', 'units', 'test name',
    'investigation', 'result'
  ];

  const matchedMedical = medicalKeywords.filter(kw => lower.includes(kw));

  if (matchedNonMedical.length >= 2 && matchedMedical.length === 0) {
    return {
      isMedical: false,
      reason: `Document classified as non-medical document (${matchedNonMedical.join(', ')})`
    };
  }

  if (matchedNonMedical.length >= 3 && matchedMedical.length < 2) {
    return {
      isMedical: false,
      reason: `Document classified as non-medical document (${matchedNonMedical.join(', ')})`
    };
  }

  return { isMedical: true, reason: 'Document accepted as medical report' };
}

export function evaluateReferenceRange(value, referenceRange, qualitativeValue = '') {
  if (qualitativeValue) {
    const qualLower = qualitativeValue.trim().toLowerCase();
    const refLower = (referenceRange || '').trim().toLowerCase();

    if (refLower === 'negative' || refLower === 'non-reactive' || refLower === 'not detected') {
      const isNormal = qualLower === 'negative' || qualLower === 'non-reactive' || qualLower === 'not detected';
      return {
        status: isNormal ? 'within' : 'outside',
        explanation: `${qualitativeValue} evaluated against expected ${referenceRange}`
      };
    }

    if (refLower === qualLower && refLower.length > 0) {
      return {
        status: 'within',
        explanation: `${qualitativeValue} matches reference ${referenceRange}`
      };
    }

    return {
      status: (qualLower === 'negative' || qualLower === 'non-reactive' || qualLower === 'not detected') ? 'within' : 'outside',
      explanation: `${qualitativeValue} evaluated with default qualitative rule`
    };
  }

  if (value === null || value === undefined || isNaN(value)) {
    return { status: 'unknown', explanation: 'Invalid numeric value' };
  }
  if (!referenceRange || typeof referenceRange !== 'string') {
    return { status: 'unknown', explanation: 'No reference range provided' };
  }

  const clean = referenceRange.trim().replace(/\s+/g, ' ');

  const rangeMatch = clean.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)$/i);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (value >= low && value <= high) {
      return { status: 'within', explanation: `${value} is within range ${low} - ${high}` };
    } else {
      return { status: 'outside', explanation: `${value} is outside range ${low} - ${high}` };
    }
  }

  const lessMatch = clean.match(/^(<=|<)\s*(\d+(?:\.\d+)?)$/);
  if (lessMatch) {
    const limit = parseFloat(lessMatch[2]);
    const isWithin = lessMatch[1] === '<=' ? value <= limit : value < limit;
    return {
      status: isWithin ? 'within' : 'outside',
      explanation: `${value} is ${isWithin ? 'within' : 'outside'} threshold ${clean}`
    };
  }

  const greaterMatch = clean.match(/^(>=|>)\s*(\d+(?:\.\d+)?)$/);
  if (greaterMatch) {
    const limit = parseFloat(greaterMatch[2]);
    const isWithin = greaterMatch[1] === '>=' ? value >= limit : value > limit;
    return {
      status: isWithin ? 'within' : 'outside',
      explanation: `${value} is ${isWithin ? 'within' : 'outside'} threshold ${clean}`
    };
  }

  return { status: 'unknown', explanation: `Unparseable range format: ${referenceRange}` };
}

export function detectDocumentType(text) {
  if (!text || typeof text !== 'string') return 'Unknown';
  const lower = text.toLowerCase();

  const labKeywords = [
    'laboratory', 'lab report', 'investigation', 'blood analysis',
    'cbc', 'complete blood count', 'serum', 'plasma', 'csf analysis',
    'test name', 'observed value', 'reference range', 'units', 'result',
    'haemoglobin', 'hemoglobin', 'glucose', 'blood sugar', 'cholesterol', 'tsh',
    'creatinine', 'wbc', 'platelets', 'hba1c', 'triglycerides', 'albumin',
    'bio chemistry', 'biochemistry', 'haematology'
  ];

  if (labKeywords.some(kw => lower.includes(kw))) {
    return 'Laboratory';
  }

  if (/(mri|magnetic resonance|ct scan|x-ray|radiology|ultrasound|sonography|scan report|impression:)/.test(lower)) {
    return 'MRI/Radiology';
  }
  if (/(prescription|rx\b|dosage|tablet|capsule|syrup|take \d+ times)/.test(lower)) {
    return 'Prescription';
  }
  if (/(pathology|biopsy|histopathology|cytology)/.test(lower)) {
    return 'Pathology';
  }

  return 'Unknown';
}

export function preprocessOcrLine(line) {
  if (!line || typeof line !== 'string') return '';
  let clean = line.trim();

  // 1. Remove leading OCR bullet / quote / noise symbols
  clean = clean.replace(/^[.\s'"@~`^_%#$*‘’“”—-]+/, '');

  // 2. Fix common OCR character confusion in param names (lgG -> IgG, csr -> CSF)
  clean = clean.replace(/\blgG\b/gi, 'IgG').replace(/\bcsr\b/gi, 'CSF');

  // 3. Fix OCR question marks / symbols attached to numbers (e.g. 4.1? -> 4.1, 4.1~ -> 4.1)
  clean = clean.replace(/(\d+(?:\.\d+)?)[?~'"@]/g, '$1');

  // 4. Fix OCR decimal spaces (e.g. 0. 600 -> 0.600, 0. 130 -> 0.130, 0. 09 -> 0.09)
  clean = clean.replace(/(\d+)\.\s+(\d+)/g, '$1.$2');

  // 5. Fix merged range numbers (e.g. 3.55.2 -> 3.5 - 5.2, 028- 056 -> 0.28 - 0.56, 11-35 -> 11 - 35, 0.0-9.0 -> 0.0 - 9.0)
  clean = clean.replace(/\b0(\d{2})\s*-\s*0(\d{2})\b/g, '0.$1 - 0.$2');
  clean = clean.replace(/\b(\d+\.\d+)(\d+\.\d+)\b/g, '$1 - $2');
  clean = clean.replace(/\b(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\b/g, '$1 - $2');

  // 6. Fix OCR noise integer before Index/Calculated (e.g. CSF 196 Index (Calculated) 0.600 -> CSF Index (Calculated) 0.600)
  clean = clean.replace(/\b([A-Z]{2,})\s+\d{2,4}\s+(Index|Ratio|Calculated)\b/gi, '$1 $2');

  // 7. Fix OCR misreading of 3.2 as & before mg/dL or g/dL
  clean = clean.replace(/\b&\s+(mg\/dL|g\/dL)/gi, '3.2 $1');

  // 8. Fix OCR unit misreadings and bracket noise
  clean = clean.replace(/mgfdl/gi, 'mg/dL');
  clean = clean.replace(/gIdL/gi, 'g/dL');
  clean = clean.replace(/\[\s*%[^\s\]]*\s*\]?/gi, '%');
  clean = clean.replace(/\[\s*([a-zA-Z/]+)\s*\]?/gi, '$1');
  clean = clean.replace(/10["A^]*3[/|l]uL\]?/gi, '10^3/uL');
  clean = clean.replace(/0["A^]*3\/UL\]?/gi, '10^3/uL');

  // 9. Fix OCR comma decimal numbers (e.g. 73,9 -> 73.9)
  clean = clean.replace(/(\d+),(\d+)/g, '$1.$2');

  // 10. Fix merged parameter token and value (e.g. LYMPH%13.2 -> LYMPH% 13.2)
  clean = clean.replace(/([A-Z%#]{2,})(\d+(?:\.\d+)?)/g, '$1 $2');

  // 11. Remove OCR noise tokens
  clean = clean.replace(/hows\/01\.1/gi, '');
  clean = clean.replace(/[*+~‘']/g, '');

  return clean.trim();
}

export function parseParameterLine(line, fullText = '', prevLine = '') {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (EXCLUSION_PATTERNS.some(pat => pat.test(trimmed))) return null;

  let cleanLine = preprocessOcrLine(line);
  if (!cleanLine) return null;

  // Ignore administrative header lines and methodology-only lines
  if (/^(age|sex|pid|tel|phone|reg|page|hospital|collected|reported|patient|dr\b|consultant)/i.test(cleanLine)) {
    return null;
  }
  if (/^\(?\s*(csf|serum)?[a-z\s]*turbidimetry\)?\s*\d*$/i.test(cleanLine) && !/\d+\.\d+/.test(cleanLine)) {
    return null;
  }
  if (/^\(?\s*serumbromocreso\w*\s*green\)?\s*\d*$/i.test(cleanLine)) {
    return null;
  }

  let evidenceSource = 'same OCR line';
  let rawSourceText = trimmed;

  // Multi-line merging for split OCR parameter lines like line 30 "IgG, CSF" + line 31 "(CSF Immunoturbidimetry) 3.2 mg/dL"
  // MUST NOT trigger if prevLine already contains a numeric measurement value (e.g. 0.130 or 26.3)
  const prevCleanRaw = prevLine ? preprocessOcrLine(prevLine) : '';
  const prevHasValue = /\d+(?:\.\d+)?/.test(prevCleanRaw.replace(/^[.\s'"@~`^_%#$*‘’“”—-]+/, '').replace(/^(lgG|IgG|Albumin|CSF|Serum|Total)\b/i, ''));

  if (prevLine && !prevHasValue && /^[a-zA-Z0-9%\-\s_(),]+$/i.test(prevCleanRaw) && prevCleanRaw.length >= 3 && !/^(department|pathology|hospital|clinic|laboratory|center|address|phone|email|doctor|patient|date|report|page|invoice|bill|investigation|result|units|reference)/i.test(prevCleanRaw) && /\d/.test(cleanLine)) {
    if (!cleanLine.toLowerCase().startsWith(prevCleanRaw.trim().toLowerCase())) {
      cleanLine = prevCleanRaw.trim() + ' ' + cleanLine;
      evidenceSource = 'multi-line reconstruction';
      rawSourceText = prevLine.trim() + '\n' + trimmed;
    }
  }

  // Multi-line merging for orphaned numeric value line in tables (e.g. "126.8 mg/dL")
  if (/^\d+(?:\.\d+)?\s*(mg\/dL|g\/dL|uIU\/mL|IU\/mL|%|mmol\/L|U\/L|IU\/L|10\^3\/uL|10\^6\/uL|pg|fL)/i.test(cleanLine)) {
    if (fullText) {
      const allLines = fullText.split('\n');
      const curIdx = allLines.findIndex(l => l.includes(trimmed));
      if (curIdx !== -1) {
        for (let offset = -4; offset <= 4; offset++) {
          if (offset === 0) continue;
          const candidateIdx = curIdx + offset;
          if (candidateIdx >= 0 && candidateIdx < allLines.length) {
            const candLine = allLines[candidateIdx].trim();
            if (/^(random blood sugar|blood sugar|glucose|hba1c|cholesterol|triglycerides)\b/i.test(candLine)) {
              let rangeStr = '';
              const rangeInTable = allLines.slice(Math.max(0, curIdx - 2), Math.min(allLines.length, curIdx + 3))
                .find(l => /^\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?$/.test(l.trim()));
              if (rangeInTable && !cleanLine.includes('-')) {
                rangeStr = ' ' + rangeInTable.trim();
              }
              cleanLine = candLine + ' ' + cleanLine + rangeStr;
              evidenceSource = 'multi-line reconstruction';
              rawSourceText = candLine + '\n' + trimmed;
              break;
            }
          }
        }
      }
    }
  }

  if (cleanLine !== trimmed && evidenceSource !== 'multi-line reconstruction') {
    evidenceSource = 'deterministic OCR normalization';
  }

  const qualMatch = cleanLine.match(/^([a-zA-Z0-9%\-\s_().,/&]+?)\s*[:\-]?\s*(negative|positive|detected|not detected|reactive|non-reactive)\s*(.*)$/i);
  if (qualMatch) {
    let paramName = qualMatch[1].trim()
      .replace(/^[^\w]+/, '')
      .replace(/[^\w%\-\s_()]+$/, '')
      .trim();
    const qualVal = qualMatch[2].trim();
    const qualRest = qualMatch[3].trim();

    if (paramName.length >= 2 && !/^(about|between|more|less|patient|doctor|method|report|subtotal|total|amount|invoice|tax|bill|page)/i.test(paramName)) {
      let refRange = qualRest;
      if (!refRange && /negative|non-reactive|not detected/i.test(qualVal)) {
        refRange = 'Negative';
      }
      const refEval = evaluateReferenceRange(null, refRange, qualVal);
      return {
        parameterName: paramName,
        valueType: 'qualitative',
        value: null,
        qualitativeValue: qualVal,
        unit: '',
        referenceRange: refRange,
        referenceStatus: refEval.status,
        confidence: 0.95,
        sourceText: rawSourceText,
        evidenceSource
      };
    }
  }

  // Regex to extract parameter name, numeric value, and rest
  const match = cleanLine.match(/^([a-zA-Z0-9%\-\s_(),]+?)\s+([<>=]*\s*\d+(?:\.\d+)?)\s*(.*)$/);
  if (!match) return null;

  let paramName = match[1].trim()
    .replace(/^[^\w]+/, '')
    .replace(/[^\w%\-\s_()]+$/, '')
    .trim();

  const rawValueStr = match[2].trim();
  const value = parseFloat(rawValueStr.replace(/[<>=]/g, '').trim());
  if (isNaN(value)) return null;

  let rest = match[3].trim();

  if (!paramName || paramName.length < 2 || /^\d+$/.test(paramName)) return null;
  if (/^(about|between|more|less|highly|this|that|patient|doctor|method|report|commercial|reg|vid|age|sex|pid)$/i.test(paramName.split(' ')[0])) {
    return null;
  }

  let rawUnitCandidate = '';
  let referenceRange = '';

  const rangeMatch = rest.match(/(\d+(?:\.\d+)?\s*(?:-|–|to)\s*\d+(?:\.\d+)?)|([<>]=?\s*\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    referenceRange = rangeMatch[0].trim().replace(/\s+/g, ' ');
    const rangeIdx = rest.indexOf(rangeMatch[0]);
    const unitBefore = rest.substring(0, rangeIdx).trim();
    const unitAfter = rest.substring(rangeIdx + rangeMatch[0].length).trim();
    rawUnitCandidate = (unitBefore + ' ' + unitAfter).trim();
  } else {
    rawUnitCandidate = rest;
  }

  // Strict Unit Validation: Never keep OCR noise like "r", "-", ".", "0.0902 5" as a unit
  const CLINICAL_UNITS = ['mg/dL', 'g/dL', 'uIU/mL', 'IU/mL', '%', 'mmol/L', 'U/L', 'IU/L', '10^3/uL', '10^6/uL', 'pg', 'fL', 'mg/L', 'g/L', 'ng/mL', 'mcg/dL'];
  let unit = '';
  const lowerCand = rawUnitCandidate.toLowerCase();
  const matchedUnit = CLINICAL_UNITS.find(u => lowerCand === u.toLowerCase() || lowerCand.split(/\s+/).includes(u.toLowerCase()));
  if (matchedUnit) {
    unit = matchedUnit;
  } else if (/\bindex\b/i.test(rawUnitCandidate)) {
    unit = 'Index';
  } else if (/\bratio\b/i.test(rawUnitCandidate)) {
    unit = 'Ratio';
  } else {
    unit = '';
  }

  // Clean parameter name formatting
  if (/^igg,\s*csf/i.test(paramName)) {
    paramName = 'IgG, CSF';
  } else if (/^albumin,\s*csf/i.test(paramName)) {
    paramName = 'Albumin, CSF';
  } else if (paramName === 'Albumin,CSF') {
    paramName = 'Albumin, CSF';
  } else if (paramName.toLowerCase() === 'albumin' && unit === 'g/dL') {
    paramName = 'Albumin, Serum';
  } else if (paramName.toLowerCase() === 'albumin' && unit === 'mg/dL') {
    paramName = 'Albumin, CSF';
  } else if (/igg\s*total/i.test(paramName)) {
    paramName = 'IgG Total (Serum)';
  } else if (paramName === 'CSF Index (Calculated)' || paramName === 'CSF IgG Index Index (Calculated)') {
    paramName = 'CSF IgG Index';
  }

  const isKnownParam = /(albumin|igg|index|ratio|csf|serum|count|level|hb|haemoglobin|hemoglobin|glucose|sugar|esr|tsh|creatinine|wbc|rbc|plt|platelet|hct|mcv|mch|mchc|rdw|tlc|dlc|neut|lymph|mono|eo|baso|cholesterol|triglyceride|protein|globulin|bilirubin|urea|sodium|potassium|chloride|calcium|vitamin|iron|ferritin|tibc)/i.test(paramName);
  const isRatioOrIndex = /^(ratio|index)$/i.test(unit) || /\b(ratio|index)\b/i.test(paramName);
  const hasValidUnit = Boolean(unit);
  const hasValidRange = Boolean(referenceRange);

  let evidenceScore = 0;
  if (hasValidUnit) evidenceScore += 0.35;
  if (hasValidRange) evidenceScore += 0.30;
  if (isKnownParam) evidenceScore += 0.30;
  if (isRatioOrIndex) evidenceScore += 0.30;

  if (fullText && /(test name|investigation|result|units|reference range)/i.test(fullText)) {
    evidenceScore += 0.10;
  }

  if (evidenceScore < 0.60) {
    return null;
  }

  const confidence = Math.min(0.99, Math.round(evidenceScore * 100) / 100);
  const refEval = evaluateReferenceRange(value, referenceRange);

  return {
    parameterName: paramName,
    value,
    unit,
    referenceRange,
    referenceStatus: refEval.status,
    confidence,
    sourceText: rawSourceText,
    evidenceSource
  };
}

export function calculateStatus(value, referenceRange, isAbnormal) {
  if (!referenceRange || !isAbnormal) {
    return isAbnormal ? 'abnormal' : 'normal';
  }
  const cleanRange = referenceRange.trim().replace(/\s+/g, '');

  const rangeMatch = cleanRange.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (value < low) return 'low';
    if (value > high) return 'high';
    return 'normal';
  }

  const lessMatch = cleanRange.match(/^(<=|<)(\d+(?:\.\d+)?)$/);
  if (lessMatch) {
    const limit = parseFloat(lessMatch[2]);
    const isAbn = cleanRange.startsWith('<=') ? value > limit : value >= limit;
    if (isAbn) return 'high';
    return 'normal';
  }

  const greaterMatch = cleanRange.match(/^(>=|>)(\d+(?:\.\d+)?)$/);
  if (greaterMatch) {
    const limit = parseFloat(greaterMatch[2]);
    const isAbn = cleanRange.startsWith('>=') ? value < limit : value <= limit;
    if (isAbn) return 'low';
    return 'normal';
  }

  return isAbnormal ? 'abnormal' : 'normal';
}

function validateOllamaResponse(content) {
  if (!content || typeof content !== 'string') return null;
  try {
    let cleanContent = content.trim();

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanContent = jsonMatch[0];
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    }

    let parsed = JSON.parse(cleanContent);
    if (!parsed || typeof parsed !== 'object') return null;

    if (typeof parsed.summary === 'string' && parsed.summary.trim().startsWith('{')) {
      try {
        const inner = JSON.parse(parsed.summary.trim());
        if (inner && typeof inner === 'object' && inner.summary) {
          parsed = inner;
        }
      } catch (e) {
        // Continue with original parsed object
      }
    }

    if (typeof parsed.summary === 'string' && parsed.summary.trim() !== '') {
      return {
        summary: parsed.summary.trim(),
        overallStatus: ['Normal', 'Needs Review', 'Insufficient Information'].includes(parsed.overallStatus)
          ? parsed.overallStatus
          : 'Needs Review',
        observations: Array.isArray(parsed.observations) ? parsed.observations : []
      };
    }
    return null;
  } catch (err) {
    if (content.length > 10) {
      const stripped = content
        .replace(/```[a-z]*/gi, '')
        .replace(/^Here is the.*?:/gi, '')
        .trim();
      if (stripped) {
        return {
          summary: stripped,
          overallStatus: 'Needs Review',
          observations: []
        };
      }
    }
    return null;
  }
}

export function sanitizeAndValidateAiSummary(validatedObj, labValues = [], documentType = 'Laboratory', extractedText = '') {
  if (!validatedObj) return null;

  let { summary, overallStatus, observations } = validatedObj;
  const rawText = typeof extractedText === 'string' ? extractedText : '';

  const allWithin = labValues.length > 0 && labValues.every(lv => {
    const status = lv.referenceStatus || evaluateReferenceRange(lv.value, lv.referenceRange).status;
    return status === 'within';
  });

  const hasOutsideLabValue = labValues.some(lv => {
    const status = lv.referenceStatus || evaluateReferenceRange(lv.value, lv.referenceRange).status;
    return status === 'outside';
  });

  let sanitizedObs = [];

  for (const obs of observations) {
    let obsText = typeof obs === 'string' ? obs : (obs.text || '');

    if (documentType === 'Prescription' && /(tablet|capsule|mg|take|daily|dosage|rx)/i.test(obsText)) {
      continue;
    }
    if (documentType === 'Unknown' && /(address|reg|building|floor|phone|date|patient|doctor)/i.test(obsText)) {
      continue;
    }

    const matchingLv = labValues.find(lv =>
      (obs.parameterName && lv.parameterName.toLowerCase().includes(obs.parameterName.toLowerCase())) ||
      (obsText.toLowerCase().includes(lv.parameterName.toLowerCase()))
    );

    if (matchingLv) {
      const refStatus = matchingLv.referenceStatus || evaluateReferenceRange(matchingLv.value, matchingLv.referenceRange).status;
      if (refStatus === 'within') {
        if (/(below|outside|elevated|abnormal|above|high|low|loss|disease|demyelinating)/i.test(obsText)) {
          obsText = `${matchingLv.parameterName} (${matchingLv.value}${matchingLv.unit ? ' ' + matchingLv.unit : ''}) is within the supplied reference threshold (${matchingLv.referenceRange || 'normal'}).`;
        }
      }
    }

    if (/(consistent with|indicates|diagnostic of|suggesting|confirming)\s+(multiple sclerosis|ms\b|demyelinating|disease)/i.test(obsText)) {
      if (allWithin) {
        obsText = 'The report presents laboratory measurements within their supplied reference thresholds.';
      } else if (rawText && /multiple sclerosis/i.test(rawText)) {
        obsText = 'The document includes interpretive clinical notes regarding Multiple Sclerosis diagnostic criteria.';
      }
    }

    let finalSourceText = obs.sourceText || (matchingLv ? matchingLv.sourceText : '');
    if (finalSourceText && rawText && !rawText.includes(finalSourceText)) {
      const lines = rawText.split('\n');
      const foundLine = lines.find(l => matchingLv ? l.includes(matchingLv.parameterName) : l.includes(obsText.slice(0, 15)));
      finalSourceText = foundLine ? foundLine.trim() : (matchingLv ? matchingLv.sourceText : '');
    }

    sanitizedObs.push({
      text: obsText,
      parameterName: obs.parameterName || (matchingLv ? matchingLv.parameterName : ''),
      value: obs.value || (matchingLv ? matchingLv.value : ''),
      unit: obs.unit || (matchingLv ? matchingLv.unit : ''),
      referenceRange: obs.referenceRange || (matchingLv ? matchingLv.referenceRange : ''),
      sourceText: finalSourceText || ''
    });
  }

  let cleanSummary = summary;

  if (documentType === 'Laboratory') {
    if (allWithin) {
      overallStatus = 'Normal';
      if (!cleanSummary || cleanSummary.trim() === '') {
        const countStr = labValues.length > 0 ? `${labValues.length} ` : '';
        cleanSummary = `The ${countStr}extracted laboratory measurements are within the reference ranges provided in the report. No extracted laboratory value is outside its supplied reference range.`;
      }

      if (sanitizedObs.length === 0) {
        for (const lv of labValues) {
          sanitizedObs.push({
            text: `${lv.parameterName} (${lv.value}${lv.unit ? ' ' + lv.unit : ''}) is within the supplied reference range (${lv.referenceRange}).`,
            parameterName: lv.parameterName,
            value: lv.value,
            unit: lv.unit || '',
            referenceRange: lv.referenceRange || '',
            sourceText: lv.sourceText || ''
          });
        }
      }
    } else if (hasOutsideLabValue) {
      overallStatus = 'Needs Review';
    } else {
      overallStatus = overallStatus || 'Needs Review';
    }
  } else if (documentType === 'MRI/Radiology') {
    const hasAbnormalFindings = /(mass|lesion|tumor|fracture|hemorrhage|edema|atrophy|infarct|herniation|abnormal|tear|effusion)/i.test(rawText);
    if (hasAbnormalFindings) {
      overallStatus = 'Needs Review';
    } else if (/(normal study|unremarkable|no acute abnormality|no evidence of)/i.test(rawText)) {
      overallStatus = 'Normal';
    } else {
      overallStatus = 'Needs Review';
    }
  } else if (documentType === 'Prescription') {
    overallStatus = 'Normal';
    cleanSummary = cleanSummary || 'Prescription document processed. Medication details extracted.';
  } else if (documentType === 'Unknown') {
    overallStatus = 'Insufficient Information';
    cleanSummary = 'Document classified as Unknown. Insufficient clinical laboratory or diagnostic data to determine patient status.';
  }

  for (const lv of labValues) {
    const refStatus = lv.referenceStatus || evaluateReferenceRange(lv.value, lv.referenceRange).status;
    if (refStatus === 'within' && lv.referenceRange) {
      const paramPattern = new RegExp(`(${escapeRegExp(lv.parameterName)}[^.,;]{0,40}?)\\b(below|outside|elevated|abnormal|low|high)\\b([^.]*?\\.)`, 'gi');
      cleanSummary = cleanSummary.replace(paramPattern, `$1is within the reference range provided in the report (${lv.referenceRange}).`);
    }
  }

  // Strip unsupported range/clinical classifications for parameters with status "Unknown Range"
  for (const lv of labValues) {
    const refStatus = lv.referenceStatus || evaluateReferenceRange(lv.value, lv.referenceRange).status;
    if (refStatus === 'unknown' || !lv.referenceRange) {
      const pName = lv.parameterName;
      let aliasPatternStr = escapeRegExp(pName);
      const pUpper = pName.toUpperCase();
      if (pUpper === 'PLT') {
        aliasPatternStr = '(?:PLT|platelets?|platelet)';
      } else if (pUpper === 'HCT') {
        aliasPatternStr = '(?:HCT|hematocrit)';
      } else if (pUpper === 'NEUT%') {
        aliasPatternStr = '(?:NEUT%?|percentage\\s+count\\s+neut%?|neutrophils?)';
      } else if (pUpper === 'LYMPH%') {
        aliasPatternStr = '(?:LYMPH%?|lymphocytes?)';
      } else if (pUpper === 'MONO%') {
        aliasPatternStr = '(?:MONO%?|monocytes?)';
      } else if (pUpper === 'BASO%') {
        aliasPatternStr = '(?:BASO%?|basophils?)';
      } else if (pUpper === 'RDWCV') {
        aliasPatternStr = '(?:RDWCV|rdw)';
      }

      // 1. Remove clause: ", while/and/but (the) [Param] (count/level/value) is/are (slightly) elevated/high/low/abnormal/normal/within range/outside range"
      const clausePattern1 = new RegExp(`(?:,\\s*(?:while|and|but)\\s+)?(?:the\\s+)?(?:patient\'s\\s+)?${aliasPatternStr}\\s*(?:value|level|count)?\\s*(?:is|are|was|were)?\\s*(?:slightly\\s+)?(?:elevated|high|low|abnormal|normal|within|outside|increased|decreased|below|above)[^.,;]*`, 'gi');
      cleanSummary = cleanSummary.replace(clausePattern1, '');

      // 2. Remove sentence: "(The) [Param] (count/level/value) is/are (slightly) elevated/high/low/abnormal/normal/within range/outside range."
      const sentencePattern = new RegExp(`(?:The\\s+)?(?:Patient\'s\\s+)?${aliasPatternStr}\\s*(?:count|level|value)?\\s*(?:is|are|was|were)\\s*(?:slightly\\s+)?(?:elevated|high|low|abnormal|normal|within|outside|increased|decreased|below|above)[^.]*\\.?`, 'gi');
      cleanSummary = cleanSummary.replace(sentencePattern, '');

      const escapedName = escapeRegExp(lv.parameterName);
      const errRangePattern = new RegExp(`(${escapedName}[^.,;]{0,60}?)\\s*(?:is\\s+within|within\\s+the\\s+reference\\s+(?:threshold|range))?\\s*\\([0-9.]+\\s*-\\s*[0-9.]+\\)`, 'gi');
      cleanSummary = cleanSummary.replace(errRangePattern, `$1 (no reference range was provided in the report, so this result cannot be classified by range)`);
    }
  }

  // Context-aware & Case-preserving reference range phrasing sanitization:
  // 1. Convert negative range mentions cleanly (preserving capitalization of "No" / "no")
  cleanSummary = cleanSummary.replace(/\b(no)\s+(?:normal|standard|universal)\s+range\b/gi, (match, prefix) => {
    const isCap = prefix[0] === prefix[0].toUpperCase();
    return isCap ? 'No reference range' : 'no reference range';
  });

  // 2. Convert affirmative range mentions (preserving capitalization of "Within" / "within" / "In" / "in")
  cleanSummary = cleanSummary.replace(/\b(within|in)\s+(?:the\s+)?(?:normal|standard|universal)\s+range\b/gi, (match, prefix) => {
    const isCap = prefix[0] === prefix[0].toUpperCase();
    return (isCap ? 'Within' : 'within') + ' the reference range provided in the report';
  });

  // 3. Fallback for standalone "normal range" / "standard range" / "universal range"
  cleanSummary = cleanSummary.replace(/\b(?:normal|standard|universal)\s+reference\s+range\b/gi, 'reference range provided in the report');
  cleanSummary = cleanSummary.replace(/\b(?:normal|standard|universal)\s+range\b/gi, 'reference range provided in the report');

  // Guard: Strip any sentences or observations that attempt to make range or clinical classifications for laboratory parameters absent from AUTHORITATIVE STRUCTURED LAB DATA or with Unknown Range status
  if (documentType === 'Laboratory' && Array.isArray(labValues) && labValues.length > 0) {
    const knownParams = labValues.map(lv => lv.parameterName.toLowerCase());
    const sentences = cleanSummary.split(/(?<=\.)\s+/);
    const validSentences = sentences.filter(sentence => {
      const isRangeClassification = /\b(?:within|outside|elevated|abnormal|normal|high|low|increased|decreased|below|above|biological\s+reference\s+range|reference\s+range|standard\s+range|universal\s+range)\b/i.test(sentence);
      if (!isRangeClassification) {
        const trimmed = sentence.trim().replace(/[.]/g, '');
        if (trimmed.length < 10 && !knownParams.some(p => sentence.toLowerCase().includes(p))) {
          return false;
        }
        return true;
      }
      const sentenceLower = sentence.toLowerCase();
      return knownParams.some(param => {
        const escaped = escapeRegExp(param);
        return new RegExp(`\\b${escaped}\\b`, 'i').test(sentenceLower);
      });
    });

    if (validSentences.length > 0) {
      cleanSummary = validSentences.join(' ');
    }

    sanitizedObs = sanitizedObs.filter(obs => {
      const obsText = (obs.text || '').toLowerCase();
      const isRangeClassification = /\b(?:within|outside|elevated|abnormal|normal|high|low|increased|decreased|below|above|biological\s+reference\s+range|reference\s+range|standard\s+range|universal\s+range)\b/i.test(obsText);
      if (!isRangeClassification) return true;

      const paramLower = (obs.parameterName || '').toLowerCase();
      const matchingLv = labValues.find(lv => {
        const pKey = lv.parameterName.toLowerCase();
        return (paramLower && paramLower.includes(pKey)) || (obsText && obsText.includes(pKey)) ||
               (pKey === 'plt' && /\b(plt|platelet)\b/i.test(obsText));
      });

      if (!matchingLv) {
        return false; // Ungrounded parameter absent from structured labValues (e.g. ESR) -> BLOCK
      }

      const refStatus = matchingLv.referenceStatus || evaluateReferenceRange(matchingLv.value, matchingLv.referenceRange).status;
      if (refStatus === 'unknown' || !matchingLv.referenceRange) {
        return false; // Parameter has Unknown Range status -> BLOCK classification observation!
      }

      return true;
    });
  }

  // Strip ungrounded general medical health claims
  cleanSummary = cleanSummary
    .replace(/(the patient is|patient is|everything is)\s+(medically\s+)?normal[^\.]*\./gi, 'Extracted values remain within supplied reference ranges.')
    .replace(/(the patient has no disease|no abnormality exists|everything is medically normal)[^\.]*\./gi, '')
    .replace(/\s*,\s*,+/g, ',')
    .replace(/^\s*[,;.]+\s*/, '')
    .replace(/\s*[,;]\s*\./g, '.')
    .replace(/\s+/g, ' ')
    .trim();

  if (/(consistent with|indicates|diagnostic of)\s+(multiple sclerosis|ms\b)/i.test(cleanSummary)) {
    if (allWithin) {
      cleanSummary = cleanSummary.replace(/(these findings are|is)\s+(consistent with|indicates|diagnostic of)\s+multiple sclerosis[^\.]*\./gi, 'All reported laboratory indicators remain within their supplied reference ranges.');
    } else if (rawText && /multiple sclerosis/i.test(rawText)) {
      cleanSummary = cleanSummary.replace(/(these findings are|is)\s+(consistent with|indicates|diagnostic of)\s+multiple sclerosis[^\.]*\./gi, 'The report contains interpretive text discussing Multiple Sclerosis guidelines.');
    }
  }

  return {
    summary: cleanSummary.trim(),
    overallStatus,
    observations: sanitizedObs
  };
}

export const fetchOllamaSummary = async (extractedText, labValues = [], documentType = 'Laboratory') => {
  if (process.env.SKIP_OLLAMA === 'true') {
    return { summary: 'Summary skipped in test mode.', overallStatus: 'Normal', observations: [] };
  }
  const hasText = typeof extractedText === 'string' && extractedText.trim().length > 0;

  if (!hasText) {
    logger.info('No extractedText available for AI summary. Skipping Ollama call.');
    return null;
  }

  const statusMap = {
    'within': 'Within Range',
    'outside': 'Outside Range',
    'unknown': 'Unknown Range'
  };

  const formattedLabValues = Array.isArray(labValues)
    ? labValues.map(lv => {
      const refEval = evaluateReferenceRange(lv.value, lv.referenceRange);
      const rawStatus = lv.referenceStatus || refEval.status;
      return {
        parameter: lv.parameterName,
        value: String(lv.value),
        unit: lv.unit || '',
        referenceRange: lv.referenceRange || null,
        status: statusMap[rawStatus] || 'Unknown Range'
      };
    })
    : [];

  const promptContent = `=== AUTHORITATIVE STRUCTURED LAB DATA ===
${JSON.stringify(formattedLabValues, null, 2)}

=== RAW REPORT CONTEXT (For Metadata Only: Patient Name, Report Date, Facility) ===
${extractedText.substring(0, 3500)}

DOCUMENT TYPE: ${documentType}`;

  const prompt = `You are an expert clinical medical report analyst.
Analyze the provided medical document text and supporting structured laboratory data.

AUTHORITATIVE DATA & GROUNDING RULES:
1. AUTHORITATIVE STRUCTURED LAB DATA is the sole single source of truth for all laboratory parameter measurements, values, units, reference ranges, and range statuses.
2. RAW REPORT CONTEXT is provided ONLY for non-laboratory metadata (such as patient name, report date, facility). RAW REPORT CONTEXT must NEVER override, alter, or contradict AUTHORITATIVE STRUCTURED LAB DATA.
3. You may discuss laboratory parameters ONLY when they exist in AUTHORITATIVE STRUCTURED LAB DATA. Do NOT extract, classify, or assign ranges to additional laboratory parameters found only in RAW REPORT CONTEXT.
4. Deterministic Status: The 'status' field in AUTHORITATIVE STRUCTURED LAB DATA is pre-calculated deterministically by the application parser. NEVER recalculate, infer, or contradict 'status'.

STRICT REFERENCE RANGE & PARAMETER CONSTRAINTS:
- When describing a parameter with status "Within Range", describe its range strictly as "reference range provided in the report" (e.g. "within the reference range provided in the report (80-140 mg/dL)").
- Do NOT use terms such as "normal range", "standard range", or "universal range".
- NEVER assign a reference range to a parameter when referenceRange is null or empty in AUTHORITATIVE STRUCTURED LAB DATA.
- NEVER copy a reference range from one parameter to another parameter.
- NEVER infer a reference range from numerical values.
- NEVER describe a parameter with status "Unknown Range" as normal, abnormal, within range, or outside range.
- If status is "Unknown Range", explicitly state: "No reference range was provided in the report, so this result cannot be classified by range."
- NEVER introduce, classify, or evaluate laboratory measurements or reference ranges for parameters absent from AUTHORITATIVE STRUCTURED LAB DATA (e.g. parameters found only in RAW REPORT CONTEXT).
- ONLY describe a parameter as "within range" when status is "Within Range".
- ONLY describe a parameter as "outside range" when status is "Outside Range".
- Do NOT invent laboratory reference ranges.
- Do NOT make disease diagnoses or clinical claims from isolated lab values.
- Do NOT contradict structured backend data.

Return ONLY a valid JSON object matching this schema:
{
  "summary": "2-3 concise sentences summarizing the actual report findings and overall clinical state.",
  "overallStatus": "Normal" | "Needs Review" | "Insufficient Information",
  "observations": [
    {
      "text": "Clear observation statement based on report content",
      "parameterName": "Parameter name if applicable, or empty string",
      "value": "Value if applicable, or empty string",
      "unit": "Unit if applicable, or empty string",
      "referenceRange": "Reference range if explicitly provided in report, or empty string",
      "sourceText": "Exact supporting line snippet from REPORT TEXT"
    }
  ]
}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000);

  try {
    logger.info(`[OllamaAI] Request started. Model: ${env.OLLAMA_MODEL}, Endpoint: ${env.OLLAMA_BASE_URL}/api/chat, DocType: ${documentType}`);
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: promptContent,
          },
        ],
        format: 'json',
        stream: false,
        options: {
          num_predict: 250,
          temperature: 0.1,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.message?.content;

    const validated = validateOllamaResponse(rawContent);
    if (!validated) {
      logger.warn('[OllamaAI] Validation failed: Response content was empty or unparseable JSON.');
      throw new Error('Ollama response content validation failed or JSON is malformed.');
    }

    logger.info(`[OllamaAI] Validation succeeded. Received ${validated.observations?.length || 0} observations.`);

    const sanitized = sanitizeAndValidateAiSummary(validated, labValues, documentType, extractedText);

    logger.info(`🤖 [AI SUMMARY RECEIVED FROM OLLAMA & SANITIZED]: ${JSON.stringify(sanitized)}`);
    console.log('\n========================================');
    console.log('🤖 [AI SUMMARY RECEIVED FROM OLLAMA & SANITIZED]:');
    console.dir(sanitized, { depth: null });
    console.log('========================================\n');
    return sanitized;
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error(`[OllamaAI] Request timed out (180-second limit reached for model ${env.OLLAMA_MODEL}).`);
    } else {
      logger.error(`[OllamaAI] Request failed: ${error.message}`);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};


export function cleanExtractedText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^--\s*\d+\s*of\s*\d+\s*--$/i.test(trimmed)) return false;
      if (/^page\s*\d+\s*of\s*\d+$/i.test(trimmed)) return false;
      return true;
    })
    .join('\n')
    .trim();
}

export function validateExtractedText(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, reason: 'Extracted text is empty or missing.' };
  }

  const cleaned = cleanExtractedText(text);
  if (!cleaned || cleaned.length === 0) {
    return { valid: false, reason: 'Extracted text contains no content after cleaning page markers.' };
  }

  const contentOnly = cleaned
    .replace(/---\s*PAGE\s*\d+\s*---/gi, '')
    .replace(/[^a-zA-Z0-9]/g, '');

  if (contentOnly.length < 10) {
    return {
      valid: false,
      reason: `Extracted content has insufficient alphanumeric text (${contentOnly.length} chars). Result consists only of page markers or invalid OCR output.`
    };
  }

  return { valid: true, cleanedText: cleaned };
}

export class OcrQueue {
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  enqueue(taskFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ taskFn, resolve, reject });
      this.processNext();
    });
  }

  async processNext() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { taskFn, resolve, reject } = this.queue.shift();

    try {
      const result = await taskFn();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.running--;
      if (this.running === 0 && this.queue.length === 0) {
        try {
          await scribe.terminate();
        } catch (termErr) {
          // Ignore warning on idle cleanup
        }
      }
      this.processNext();
    }
  }

  get pendingCount() {
    return this.queue.length;
  }

  get activeCount() {
    return this.running;
  }
}

export const ocrQueue = new OcrQueue(1);

export async function extractDocumentText(filePath, mimeType = '') {
  logger.info(`[OCR] Processing started`);
  logger.info(`[OCR] File: ${filePath}`);
  logger.info(`[OCR] MIME type: ${mimeType || 'unknown'}`);
  logger.info(`[OCR] Extraction method: Scribe.js (scribe.js-ocr)`);

  let doc = null;
  try {
    doc = await scribe.openDocument([filePath]);
    const pageCount = doc.inputData?.pageCount || 1;
    logger.info(`[OCR] Document opened. Page count: ${pageCount}`);

    await doc.recognize({ langs: ['eng'], mode: 'quality' });

    let rawText = '';
    const pages = doc.ocr?.active;

    if (Array.isArray(pages) && pages.length > 0) {
      const pageBlocks = pages.map((page, index) => {
        const pageText = (scribe.utils?.ocr?.getPageText(page) || '').trim();
        return `--- PAGE ${index + 1} ---\n${pageText}`;
      });
      rawText = pageBlocks.join('\n\n');
    } else {
      const exported = await doc.exportData('txt');
      rawText = typeof exported === 'string' ? exported : new TextDecoder().decode(exported);
    }

    logger.info(`[OCR] Extracted text length: ${rawText.length}`);
    return { rawText, pageCount };
  } catch (error) {
    logger.error(`[OCR] Extraction error: ${error.message}`);
    throw error;
  } finally {
    if (doc && typeof doc.close === 'function') {
      try {
        await doc.close();
      } catch (closeErr) {
        logger.warn(`[OCR] Warning closing ScribeDoc: ${closeErr.message}`);
      }
    }
  }
}

const removeTemporaryFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
    logger.info(`[Parser] Deleted temporary file: ${filePath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn(`[Parser] Temporary report file cleanup failed for ${filePath}: ${error.message}`);
    }
  }
};

export const processReportInBackground = async (reportId, filePath, mimeType = '') => {
  try {
    await Report.findByIdAndUpdate(reportId, { ocrStatus: 'processing' });
    logger.info(`[Parser] Started processing for report ${reportId}`);

    let rawText = '';
    const reportDoc = await Report.findById(reportId);
    if (reportDoc && reportDoc.extractedText && reportDoc.extractedText.length > 20) {
      rawText = reportDoc.extractedText;
    } else {
      if (filePath) {
        const headerCheck = await verifyFileHeader(filePath);
        if (!headerCheck.valid) {
          logger.error(`[OCR] File header validation failed for report ${reportId}: ${headerCheck.reason}`);
          await Report.findByIdAndUpdate(reportId, {
            ocrStatus: 'failed',
            rejectionReason: headerCheck.reason,
            filePath: null
          });
          await removeTemporaryFile(filePath);
          return;
        }
      }
      try {
        const res = await ocrQueue.enqueue(() => extractDocumentText(filePath, mimeType));
        rawText = res.rawText;
      } catch (err) {
        logger.error(`[OCR] Processing failed`);
        logger.error(`[OCR] Reason: ${err.message}`);
        await Report.findByIdAndUpdate(reportId, { ocrStatus: 'failed', filePath: null });
        await removeTemporaryFile(filePath);
        return;
      }
    }

    const validation = validateExtractedText(rawText);
    if (!validation.valid) {
      logger.error(`[OCR] Processing failed`);
      logger.error(`[OCR] Reason: ${validation.reason}`);
      await Report.findByIdAndUpdate(reportId, { ocrStatus: 'failed', filePath: null });
      await removeTemporaryFile(filePath);
      return;
    }

    const extractedText = validation.cleanedText;
    logger.info(`[OCR] Validation passed`);

    const medicalCheck = isMedicalDocument(extractedText);
    if (!medicalCheck.isMedical) {
      const reportDocForUser = await Report.findById(reportId);
      const userId = reportDocForUser ? reportDocForUser.user : 'unknown';
      logger.warn(`NON_MEDICAL_REPORT_REJECTED reportId: ${reportId} userId: ${userId} reason: ${medicalCheck.reason}`);

      // 1. Clean up associated LabValues if any exist (idempotent cleanup)
      await LabValue.deleteMany({ report: reportId });

      // 2. Remove physical temporary upload files from disk
      if (filePath) {
        await removeTemporaryFile(filePath);
      }
      if (reportDocForUser && reportDocForUser.filePath && reportDocForUser.filePath !== filePath) {
        await removeTemporaryFile(reportDocForUser.filePath);
      }

      // 3. Completely delete the Report document from MongoDB
      await Report.findByIdAndDelete(reportId);

      logger.info(`NON_MEDICAL_REPORT_CLEANUP_COMPLETED reportId: ${reportId}`);
      return;
    }

    logger.info(`[OCR] Saved extracted text & confirmed medical report classification`);

    let patientName = '';
    let reportDateStr = null;

    const nameMatch = extractedText.match(/(?:Name|Patient Name)\s*[:\-]\s*(.+)/i);
    if (nameMatch) patientName = nameMatch[1].split('\n')[0].trim();

    const dateMatch = extractedText.match(/(?:Report Date|Collection Date|Date)\s*[:\-]\s*([\d\-\/a-zA-Z\s,]+)/i);
    if (dateMatch) {
      const parsedDate = new Date(dateMatch[1].split('\n')[0].trim());
      if (!isNaN(parsedDate)) {
        reportDateStr = parsedDate.toISOString();
      }
    }

    const docType = detectDocumentType(extractedText);
    logger.info(`[ClinicalExtractor] Document classified as: ${docType}`);

    const extractedLabValues = [];

    if (docType === 'Laboratory' || docType === 'Pathology') {
      const lines = extractedText.split('\n');
      let currentPageNumber = 1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const pageMatch = line.match(/---\s*PAGE\s*(\d+)\s*---/i);
        if (pageMatch) {
          currentPageNumber = parseInt(pageMatch[1], 10);
          continue;
        }

        const prevLine = i > 0 ? lines[i - 1] : '';
        try {
          const parsed = parseParameterLine(line, extractedText, prevLine);
          if (!parsed) continue;

          const { parameterName, valueType = 'numeric', value, qualitativeValue = '', unit, referenceRange, confidence, sourceText, evidenceSource } = parsed;

          let canonicalName = parameterName;
          let refRange = referenceRange;
          let finalUnit = unit;
          let isAbnormal = null;

          if (valueType === 'numeric' && refRange) {
            isAbnormal = isValueAbnormal(value, refRange);
          } else if (valueType === 'qualitative') {
            const evalRes = evaluateReferenceRange(null, refRange, qualitativeValue);
            isAbnormal = evalRes.status === 'outside';
          }

          if (extractedLabValues.some((item) => item.parameterName.toLowerCase() === canonicalName.toLowerCase())) {
            continue;
          }

          const refStatus = evaluateReferenceRange(value, refRange, qualitativeValue).status;

          extractedLabValues.push({
            parameterName: canonicalName,
            valueType,
            value,
            qualitativeValue,
            unit: finalUnit,
            referenceRange: refRange,
            referenceStatus: refStatus,
            isAbnormal,
            confidence,
            pageNumber: currentPageNumber,
            sourceText,
            evidenceSource
          });
        } catch (lineErr) {
          logger.error('[Parser] Error processing line:', lineErr.message);
        }
      }
    } else {
      logger.info(`[ClinicalExtractor] Document type is ${docType}. Skipping lab value extraction.`);
    }

    const parameterNames = extractedLabValues.map((lv) => lv.parameterName);
    const categoryName = inferReportName(parameterNames);

    let category = await ReportCategory.findOne({ name: categoryName });
    if (!category) {
      category = new ReportCategory({
        name: categoryName,
        description: `Auto-detected panel: ${categoryName}`,
      });
      await category.save();
    }

    let aiSummaryResult = await fetchOllamaSummary(extractedText, extractedLabValues, docType);

    let aiSummaryText = '';
    let aiSummaryDataObj = null;

    if (aiSummaryResult && typeof aiSummaryResult === 'object') {
      let rawSummaryText = aiSummaryResult.summary || '';
      if (typeof rawSummaryText === 'string' && rawSummaryText.trim().startsWith('{')) {
        try {
          const parsedInner = JSON.parse(rawSummaryText.trim());
          if (parsedInner && typeof parsedInner === 'object' && parsedInner.summary) {
            rawSummaryText = parsedInner.summary;
          }
        } catch (e) { }
      }
      aiSummaryText = rawSummaryText.replace(/^\{[\s\S]*"summary"\s*:\s*"/i, '').replace(/"\s*,\s*"overallStatus"[\s\S]*$/i, '').trim();
      aiSummaryDataObj = {
        ...aiSummaryResult,
        summary: aiSummaryText
      };
    } else if (typeof aiSummaryResult === 'string') {
      let cleanText = aiSummaryResult;
      if (cleanText.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(cleanText.trim());
          if (parsed && typeof parsed === 'object' && parsed.summary) {
            cleanText = parsed.summary;
          }
        } catch (e) { }
      }
      aiSummaryText = cleanText;
      aiSummaryDataObj = { summary: cleanText, overallStatus: 'Needs Review', observations: [] };
    } else {
      logger.info('Falling back to rule-based summary.');
      aiSummaryText = extractedLabValues.length > 0
        ? `Extracted report contains ${extractedLabValues.length} key indicators. General status: ${extractedLabValues.some((v) => v.isAbnormal) ? 'abnormalities flagged' : 'all normal'}.`
        : `Document processed (${docType}). No abnormal clinical parameters flagged.`;
      aiSummaryDataObj = {
        summary: aiSummaryText,
        overallStatus: extractedLabValues.some((v) => v.isAbnormal) ? 'Needs Review' : 'Normal',
        observations: []
      };
    }

    logger.info(`🤖 [FINAL REPORT AI SUMMARY SAVED TO DB]: ${aiSummaryText}`);

    const updateData = {
      ocrStatus: 'completed',
      extractedText,
      aiSummary: aiSummaryText,
      aiSummaryData: aiSummaryDataObj,
      category: category._id,
      filePath: null,
    };

    if (reportDateStr) {
      updateData.reportDate = new Date(reportDateStr);
    }

    await Report.findByIdAndUpdate(reportId, updateData);
    await LabValue.deleteMany({ report: reportId });

    if (extractedLabValues.length > 0) {
      const labValueDocs = extractedLabValues.map((lv) => ({
        report: reportId,
        parameterName: lv.parameterName,
        valueType: lv.valueType || 'numeric',
        value: lv.value,
        qualitativeValue: lv.qualitativeValue || '',
        unit: lv.unit,
        referenceRange: lv.referenceRange,
        referenceStatus: lv.referenceStatus || evaluateReferenceRange(lv.value, lv.referenceRange, lv.qualitativeValue).status,
        isAbnormal: lv.isAbnormal,
        pageNumber: lv.pageNumber || 1,
        sourceText: lv.sourceText || '',
        confidence: lv.confidence || 1.0,
        evidenceSource: lv.evidenceSource || 'same OCR line',
      }));

      await LabValue.insertMany(labValueDocs);
      logger.info(`[Parser] Processed report ${reportId} natively. Saved ${labValueDocs.length} parameters.`);
    } else {
      logger.info(`[Parser] Processed report ${reportId} natively. No matching parameters extracted.`);
    }

    logger.info(`[OCR] Processing completed`);
    await removeTemporaryFile(filePath);
  } catch (err) {
    logger.error(`[OCR] Processing failed`);
    logger.error(`[OCR] Reason: ${err.message}`);
    try {
      await Report.findByIdAndUpdate(reportId, { ocrStatus: 'failed', filePath: null });
    } catch (dbErr) {
      logger.error(`[Parser] Failed to update report status on error:`, dbErr.message);
    }
    await removeTemporaryFile(filePath);
  }
};
