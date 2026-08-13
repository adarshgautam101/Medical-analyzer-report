import fs from 'fs';
import Tesseract from 'tesseract.js';
import { createRequire } from 'module';
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

export function parseParameterLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  
  const skipPatterns = [
    /patient\s*name/i,
    /^name\s*[:\-]/i,
    /^age\s*[:\-]/i,
    /^gender\s*[:\-]/i,
    /^sex\s*[:\-]/i,
    /report\s*date/i,
    /collection\s*date/i,
    /received\s*date/i,
    /physician/i,
    /referred\s*by/i,
    /lab\b/i,
    /doctor/i,
    /hospital/i,
    /page\s*\d+/i,
    /mrn/i,
    /result\s*date/i
  ];
  if (skipPatterns.some(pat => pat.test(trimmed))) {
    return null;
  }

  let parameterName = '';
  let rest = '';

  
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    parameterName = parts[0].trim();
    rest = parts.slice(1).join(':').trim();
  }
  
  else if (/\s{2,}|\t/.test(trimmed)) {
    const parts = trimmed.split(/\s{2,}|\t/);
    parameterName = parts[0].trim();
    rest = parts.slice(1).join(' ').trim();
  }
  
  else {
    const match = trimmed.match(/\s([<>=\s]*\d+(?:\.\d+)?)(?=\s|$|[a-zA-Z%µ/])/);
    if (match) {
      const index = trimmed.indexOf(match[0]);
      parameterName = trimmed.substring(0, index).trim();
      rest = trimmed.substring(index).trim();
    } else {
      return null;
    }
  }

  
  parameterName = parameterName
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[^a-zA-Z0-9%\-\s_()]+$/, '')
    .trim();

  if (!parameterName || parameterName.length < 2 || /^\d+$/.test(parameterName)) {
    return null;
  }

  
  const valueMatch = rest.match(/^([<>=]*\s*\d+(?:\.\d+)?)/);
  if (!valueMatch) return null;

  const fullValStr = valueMatch[1];
  const value = parseFloat(fullValStr.replace(/[<>=]/g, '').trim());
  if (isNaN(value)) return null;

  const afterValueStr = rest.substring(fullValStr.length).trim();

  
  const rangeMatch = afterValueStr.match(/(\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?)|([<>=\s]+\d+(?:\.\d+)?)/);
  let referenceRange = '';
  let unit = '';

  if (rangeMatch) {
    referenceRange = rangeMatch[0].trim();
    const indexOfRange = afterValueStr.indexOf(rangeMatch[0]);
    const betweenValAndRange = afterValueStr.substring(0, indexOfRange).trim();
    const afterRange = afterValueStr.substring(indexOfRange + rangeMatch[0].length).trim();

    referenceRange = referenceRange.replace(/[()\[\]]/g, '').trim();
    unit = cleanUnit((betweenValAndRange + ' ' + afterRange).trim());
  } else {
    unit = cleanUnit(afterValueStr);
  }

  return {
    parameterName,
    value,
    unit,
    referenceRange
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
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }
    const parsed = JSON.parse(cleanContent);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.summary !== 'string' || parsed.summary.trim() === '') return null;
    if (parsed.overallStatus !== 'Normal' && parsed.overallStatus !== 'Needs Review') return null;
    if (!Array.isArray(parsed.observations)) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

const fetchOllamaSummary = async (extractedText, labValues) => {
  if (!labValues || labValues.length === 0) {
    logger.info('No validated lab values available. Skipping Ollama call.');
    return null;
  }

  const formattedLabValues = labValues.map(lv => ({
    parameter: lv.parameterName,
    value: lv.value,
    unit: lv.unit || '',
    referenceRange: lv.referenceRange || '',
    status: calculateStatus(lv.value, lv.referenceRange, lv.isAbnormal)
  }));

  const promptContent = `Extracted and Validated Lab Values:
${JSON.stringify(formattedLabValues, null, 2)}`;

  const prompt = `You are a medical report summarization assistant.
Analyze the following patient lab values. Create a brief summary of 2-3 short sentences (maximum 80 words) and identify key observations.

Strict Rules:
1. Use ONLY the supplied validated lab values. Never invent values or reference ranges.
2. Never change the normal/high/low status calculated by Node.js.
3. Never diagnose a disease or make unsupported medical claims.
4. Return ONLY a valid JSON object matching the requested schema. No markdown wrappers or explanation outside JSON.
5. In the "observations" array, each element must be a concise human-readable sentence detailing one specific abnormal value and how it deviates (e.g., "HbA1c is above the provided reference range."). If there are no abnormal values, the "observations" array must be empty.

JSON Schema:
{
  "summary": "string containing 2-3 sentences summary",
  "overallStatus": "Normal" or "Needs Review",
  "observations": ["sentence for abnormal parameter 1", "sentence for abnormal parameter 2"]
}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); 

  try {
    logger.info(`Requesting local Ollama summary using model: ${env.OLLAMA_MODEL}...`);
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
      throw new Error('Ollama response content validation failed or JSON is malformed.');
    }

    logger.info('Ollama summary generated and validated successfully.');
    return validated.summary;
  } catch (error) {
    logger.error(`Ollama API failed: ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

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

export const processReportInBackground = async (reportId, filePath) => {
  try {
    
    await Report.findByIdAndUpdate(reportId, { ocrStatus: 'processing' });
    logger.info(`[Parser] Started JS-native processing for report ${reportId}`);

    let extractedText = '';
    const isPdf = filePath.toLowerCase().endsWith('.pdf');
    const dotIndex = filePath.lastIndexOf('.');
    const ext = dotIndex !== -1 ? filePath.substring(dotIndex).toLowerCase() : '';
    const isImage = ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif', '.webp'].includes(ext);

    try {
      if (isPdf) {
        const fileBuffer = await fs.promises.readFile(filePath);
        const parser = new PDFParse({ data: fileBuffer });
        const data = await parser.getText();
        extractedText = data.text;
        await parser.destroy();
      } else if (isImage) {
        const result = await Tesseract.recognize(filePath, 'eng');
        extractedText = result.data.text;
      } else {
        extractedText = await fs.promises.readFile(filePath, 'utf8');
      }
    } catch (err) {
      logger.error(`[Parser] Direct extraction failed for ${reportId}, attempting fallback read:`, err.message);
      extractedText = await fs.promises.readFile(filePath, 'utf8');
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content could be extracted from this report.');
    }

    
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

    
    const lines = extractedText.split('\n');
    const extractedLabValues = [];

    for (const line of lines) {
      try {
        const parsed = parseParameterLine(line);
        if (!parsed) continue;

        const { parameterName, value, unit, referenceRange } = parsed;

        
        const searchName = CANONICAL_MAPPINGS[parameterName.toLowerCase()] || parameterName;
        const univ = await UniversalRange.findOne({
          $or: [
            { parameterName: searchName },
            { parameterName: { $regex: new RegExp('^' + escapeRegExp(searchName) + '$', 'i') } }
          ]
        });

        let canonicalName = parameterName;
        let refRange = referenceRange;
        let finalUnit = unit;
        let isAbnormal = null;

        if (univ) {
          canonicalName = univ.parameterName;
          refRange = univ.referenceRange;
          finalUnit = univ.unit;
          isAbnormal = isValueAbnormal(value, refRange);
        } else {
          if (refRange) {
            isAbnormal = isValueAbnormal(value, refRange);
          }
        }

        
        if (extractedLabValues.some((item) => item.parameterName.toLowerCase() === canonicalName.toLowerCase())) {
          continue;
        }

        extractedLabValues.push({
          parameterName: canonicalName,
          value,
          unit: finalUnit,
          referenceRange: refRange,
          isAbnormal,
        });
      } catch (lineErr) {
        logger.error('[Parser] Error processing line:', lineErr.message);
      }
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

    
    let aiSummary = await fetchOllamaSummary(extractedText, extractedLabValues);
    if (!aiSummary) {
      logger.info('Falling back to rule-based summary.');
      aiSummary = extractedLabValues.length > 0
        ? `Extracted report contains ${extractedLabValues.length} key indicators. General status: ${extractedLabValues.some((v) => v.isAbnormal) ? 'abnormalities flagged' : 'all normal'}.`
        : 'No clinical parameter deviations detected in the scanned text.';
    }

    const updateData = {
      ocrStatus: 'completed',
      extractedText,
      aiSummary,
      category: category._id,
      filePath: null, 
    };

    if (reportDateStr) {
      updateData.reportDate = new Date(reportDateStr);
    }

    await Report.findByIdAndUpdate(reportId, updateData);

    
    if (extractedLabValues.length > 0) {
      const labValueDocs = extractedLabValues.map((lv) => ({
        report: reportId,
        parameterName: lv.parameterName,
        value: lv.value,
        unit: lv.unit,
        referenceRange: lv.referenceRange,
        isAbnormal: lv.isAbnormal,
      }));

      await LabValue.insertMany(labValueDocs);
      logger.info(`[Parser] Processed report ${reportId} natively. Saved ${labValueDocs.length} parameters.`);
    } else {
      logger.info(`[Parser] Processed report ${reportId} natively. No matching parameters extracted.`);
    }

    await removeTemporaryFile(filePath);
  } catch (err) {
    logger.error(`[Parser] Failed to process report ${reportId}:`, err.message);
    try {
      await Report.findByIdAndUpdate(reportId, { ocrStatus: 'failed', filePath: null });
    } catch (dbErr) {
      logger.error(`[Parser] Failed to update report status on error:`, dbErr.message);
    }
    await removeTemporaryFile(filePath);
  }
};
