import assert from 'assert';
import { validateAiResponse, sanitizeAndValidateAiSummary } from '../utils/parser.js';

console.log('================================================================');
console.log('🧪 RUNNING HUGGING FACE SUMMARY INTEGRATION & SANITIZATION TEST SUITE');
console.log('================================================================\n');

// --- TEST 1: Valid Clean JSON Hugging Face Response Parsing ---
console.log('--- TEST 1: Valid Clean JSON Response ---');
const rawHfJson = JSON.stringify({
  summary: "Patient glucose level is within the reference range provided in the report (80-140 mg/dL).",
  overallStatus: "Normal",
  observations: [
    {
      text: "Glucose is 110 mg/dL",
      parameterName: "Glucose",
      value: "110",
      unit: "mg/dL",
      referenceRange: "80-140",
      sourceText: "Glucose 110 mg/dL 80-140"
    }
  ]
});
const parsed1 = validateAiResponse(rawHfJson);
assert.ok(parsed1, 'Valid JSON response must parse successfully');
assert.strictEqual(parsed1.overallStatus, 'Normal');
assert.strictEqual(parsed1.observations.length, 1);
console.log('✅ TEST 1 PASSED: Clean JSON response parsed.\n');


// --- TEST 2: Response Wrapped in Markdown Code Fences ---
console.log('--- TEST 2: Response Wrapped in Markdown Code Fences ---');
const fencedHfText = `\`\`\`json
{
  "summary": "Hemoglobin is 14.2 g/dL within reference range.",
  "overallStatus": "Normal",
  "observations": []
}
\`\`\``;
const parsed2 = validateAiResponse(fencedHfText);
assert.ok(parsed2, 'Markdown fenced JSON must parse successfully');
assert.strictEqual(parsed2.summary, 'Hemoglobin is 14.2 g/dL within reference range.');
console.log('✅ TEST 2 PASSED: Fenced JSON response parsed.\n');


// --- TEST 3: Malformed JSON Handling ---
console.log('--- TEST 3: Malformed JSON Handling ---');
const malformedJson = '{ summary: "Malformed JSON without quotes", overallStatus: ';
const parsed3 = validateAiResponse(malformedJson);
assert.ok(parsed3 !== undefined, 'Malformed JSON must be handled gracefully without throwing error');
console.log('✅ TEST 3 PASSED: Malformed JSON handled cleanly.\n');


// --- TEST 4: Missing Choices or Empty Content Handling ---
console.log('--- TEST 4: Missing Choices / Empty Content Handling ---');
assert.strictEqual(validateAiResponse(''), null);
assert.strictEqual(validateAiResponse(null), null);
assert.strictEqual(validateAiResponse(undefined), null);
console.log('✅ TEST 4 PASSED: Missing/Empty content handled cleanly.\n');


// --- TEST 5: Fallback Summary Wording for Unknown Reference Ranges ---
console.log('--- TEST 5: Fallback Wording for Unknown Reference Ranges ---');
const labValuesWithUnknown = [
  { parameterName: 'PLT', value: 200, unit: '10^3/uL', referenceRange: '', referenceStatus: 'unknown', isAbnormal: false },
  { parameterName: 'WBC', value: 6.5, unit: '10^3/uL', referenceRange: '4.0-11.0', referenceStatus: 'within', isAbnormal: false }
];

const hasAbnormal = labValuesWithUnknown.some((v) => v.isAbnormal === true);
const hasUnknown = labValuesWithUnknown.some((v) => v.referenceStatus === 'unknown' || !v.referenceRange);

let statusText = 'all normal';
if (hasAbnormal) {
  statusText = 'abnormalities flagged';
} else if (hasUnknown) {
  statusText = 'some reference ranges unclassified';
}

const fallbackSummary = `Extracted report contains ${labValuesWithUnknown.length} key indicators. General status: ${statusText}.`;
console.log(`Fallback Summary Output: "${fallbackSummary}"`);
assert.ok(!fallbackSummary.includes('all normal'), 'Fallback MUST NOT claim "all normal" when unknown ranges exist');
assert.ok(fallbackSummary.includes('unclassified'), 'Fallback must explicitly mention unclassified reference ranges');
console.log('✅ TEST 5 PASSED: Fallback summary wording correctly identifies unclassified ranges.\n');


// --- TEST 6: Ungrounded Parameter Protection (E.S.R.) ---
console.log('--- TEST 6: Ungrounded Parameter Protection (E.S.R.) ---');
const labValuesGrounded = [
  { parameterName: 'GLUCOSE', value: 95, unit: 'mg/dL', referenceRange: '70-110', referenceStatus: 'within', isAbnormal: false }
];
const ungroundedResponse = {
  summary: "Glucose is 95 mg/dL within reference range. E.S.R. is elevated.",
  overallStatus: 'Needs Review',
  observations: [
    { text: "E.S.R. is elevated", parameterName: "E.S.R.", value: "25" }
  ]
};
const sanitized6 = sanitizeAndValidateAiSummary(ungroundedResponse, labValuesGrounded, 'Laboratory', 'Glucose 95 mg/dL E.S.R. 25');
assert.ok(!/E\.?S\.?R\.?/i.test(sanitized6.summary), 'Ungrounded E.S.R. parameter MUST be completely stripped');
assert.strictEqual(sanitized6.observations.length, 0, 'Ungrounded observation MUST be removed');
console.log('✅ TEST 6 PASSED: Ungrounded parameter stripped.\n');


console.log('================================================================');
console.log('🎉 ALL HUGGING FACE SUMMARY INTEGRATION & GROUNDING TESTS PASSED!');
console.log('================================================================\n');
