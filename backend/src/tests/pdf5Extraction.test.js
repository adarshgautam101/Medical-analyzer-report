import assert from 'assert';
import { parseParameterLine, preprocessOcrLine, detectDocumentType } from '../utils/parser.js';

console.log('========================================');
console.log('PDF5 CLINICAL EXTRACTION & REGRESSION TEST');
console.log('========================================\n');

// Actual extractedText from PDF5 upload (Darshan Gout report)
const pdf5ExtractedText = `--- PAGE 1 ---
Department of Pathology, UHLD/LABID 4078
Patient: Darshan Gout Age: 24 Sex: Male
Physical examination revealed no abnormalities.
Laboratory results showed normal glucose levels in CSF (45-80 mg/dl).
Total leukocyte count and differential count were not provided due to missing/unparseable values.
The report awaits further analysis on total protein, IgG index, and oligoclonal band in CSF.
Page 1 of 1`;

console.log('--- PDF5 ExtractedText Line Analysis ---');
const lines = pdf5ExtractedText.split('\n');
lines.forEach((line, idx) => {
  console.log(`Line ${idx + 1}: "${line}"`);
});
console.log('----------------------------------------\n');

// Document classification test
const docType = detectDocumentType(pdf5ExtractedText);
console.log(`Document Classification for PDF5: "${docType}"`);
assert.ok(docType === 'Laboratory' || docType === 'Pathology', 'PDF5 must be classified as Laboratory or Pathology');

const candidateResults = [];
let rawCandidatesCount = 0;
let acceptedCount = 0;
let rejectedCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const prevLine = i > 0 ? lines[i - 1] : '';
  const trimmed = line.trim();

  if (!trimmed || /^---\s*page/i.test(trimmed)) continue;

  // Check if line contains any numbers or parameter candidates
  if (/\d/.test(trimmed)) {
    rawCandidatesCount++;
    const parsed = parseParameterLine(line, pdf5ExtractedText, prevLine);

    if (parsed) {
      acceptedCount++;
      candidateResults.push({
        parameterName: parsed.parameterName,
        value: parsed.value,
        unit: parsed.unit,
        referenceRange: parsed.referenceRange,
        referenceStatus: parsed.referenceStatus,
        confidence: parsed.confidence,
        sourceText: parsed.sourceText,
        evidenceSource: parsed.evidenceSource,
        status: 'ACCEPTED'
      });
    } else {
      rejectedCount++;
      let reason = 'Line is narrative text or reference-only range without a standalone patient numeric measurement value';
      if (/Department of Pathology|Age:|Sex:/i.test(trimmed)) {
        reason = 'Administrative / demographic line';
      } else if (/Page \d+/i.test(trimmed)) {
        reason = 'Header / footer page number';
      } else if (/showed|revealed|provided|awaits/i.test(trimmed)) {
        reason = 'Narrative summary sentence containing reference ranges or description without patient measurement';
      }

      candidateResults.push({
        rawLine: trimmed,
        rejectionReason: reason,
        status: 'REJECTED'
      });
    }
  }
}

console.log('\n========================================');
console.log('PDF5 CANDIDATE EXTRACTION REPORT:');
console.log('========================================');
console.log(`PDF5:`);
console.log(`Raw OCR laboratory candidates: ${rawCandidatesCount}`);
console.log(`Accepted LabValues: ${acceptedCount}`);
console.log(`Rejected candidates: ${rejectedCount}\n`);

console.log('Detailed Candidate Decisions:');
candidateResults.forEach((c, idx) => {
  console.log(`\nCandidate #${idx + 1} (${c.status}):`);
  console.dir(c, { depth: null });
});
console.log('\n========================================');

// REGRESSION ASSERTIONS
// 1. Narrative/reference-only numbers MUST NOT produce fake LabValues
assert.strictEqual(acceptedCount, 0, 'PDF5 contains no genuine patient measurement values; accepted LabValues MUST be 0.');

// 2. Verified trace for genuine report (PDF4 regression)
const pdf4Text = `IgG, CSF
(CSF Immunoturbidimetry) 3.2 mg/dL 0.8 - 4.5`;
const pdf4Parsed = parseParameterLine('(CSF Immunoturbidimetry) 3.2 mg/dL 0.8 - 4.5', pdf4Text, 'IgG, CSF');
assert.ok(pdf4Parsed, 'PDF4 genuine measurement line must be extracted');
assert.strictEqual(pdf4Parsed.parameterName, 'IgG, CSF');
assert.strictEqual(pdf4Parsed.value, 3.2);
assert.strictEqual(pdf4Parsed.unit, 'mg/dL');
assert.strictEqual(pdf4Parsed.referenceRange, '0.8 - 4.5');
assert.ok(pdf4Parsed.sourceText, 'Source text must be preserved');
assert.ok(pdf4Parsed.evidenceSource, 'Evidence source must be set');

console.log('\n✅ PDF5 REGRESSION TEST PASSED SUCCESSFULLY!');
console.log('========================================\n');
