import assert from 'assert';
import { sanitizeAndValidateAiSummary } from '../utils/parser.js';

console.log('================================================================');
console.log('🧪 RUNNING COMPREHENSIVE AI SUMMARY GROUNDING REGRESSION SUITE');
console.log('================================================================\n');

const labValues = [
  {
    parameterName: 'RANDOM BLOOD SUGAR',
    value: '126.8',
    unit: 'mg/dL',
    referenceRange: '80-140',
    referenceStatus: 'within',
    isAbnormal: false
  },
  { parameterName: 'HCT', value: '42', unit: '%', referenceRange: null, referenceStatus: 'unknown', isAbnormal: false },
  { parameterName: 'MCV', value: '88', unit: 'fL', referenceRange: null, referenceStatus: 'unknown', isAbnormal: false },
  { parameterName: 'MCH', value: '29', unit: 'pg', referenceRange: null, referenceStatus: 'unknown', isAbnormal: false },
  { parameterName: 'MCHC', value: '33.5', unit: 'g/dL', referenceRange: null, referenceStatus: 'unknown', isAbnormal: false },
  { parameterName: 'RDWCV', value: '13.2', unit: '%', referenceRange: null, referenceStatus: 'unknown', isAbnormal: false },
  { parameterName: 'NEUT%', value: '62', unit: '%', referenceRange: null, referenceStatus: 'unknown', isAbnormal: false },
  { parameterName: 'LYMPH%', value: '30', unit: '%', referenceRange: null, referenceStatus: 'unknown', isAbnormal: false },
  { parameterName: 'MONO%', value: '6', unit: '%', referenceRange: null, referenceStatus: 'unknown', isAbnormal: false },
  { parameterName: 'BASO%', value: '1', unit: '%', referenceRange: null, referenceStatus: 'unknown', isAbnormal: false },
  { parameterName: 'PLT', value: '19', unit: '10^3/uL', referenceRange: null, referenceStatus: 'unknown', isAbnormal: false }
];


// --- REQ TEST 1: PLT Slightly Elevated Classification Block ---
console.log('--- REQ TEST 1: PLT Slightly Elevated Classification Block ---');
const reqTest1Response = {
  summary: "Patient's platelet count is slightly elevated.",
  overallStatus: 'Needs Review',
  observations: []
};
const res1 = sanitizeAndValidateAiSummary(reqTest1Response, labValues, 'Laboratory', 'PLT 19');
console.log(`Sanitized Summary 1: "${res1.summary}"`);
assert.ok(!/elevated/i.test(res1.summary), 'Unsupported PLT elevation classification MUST NOT appear');
assert.ok(!/platelet/i.test(res1.summary), 'PLT classification sentence must be stripped');
console.log('✅ REQ TEST 1 PASSED: "Patient\'s platelet count is slightly elevated" blocked.\n');


// --- REQ TEST 2: PLT is High Block ---
console.log('--- REQ TEST 2: PLT is High Block ---');
const reqTest2Response = {
  summary: "PLT is high.",
  overallStatus: 'Needs Review',
  observations: []
};
const res2 = sanitizeAndValidateAiSummary(reqTest2Response, labValues, 'Laboratory', 'PLT 19');
console.log(`Sanitized Summary 2: "${res2.summary}"`);
assert.ok(!/high/i.test(res2.summary), 'PLT high classification MUST be blocked');
console.log('✅ REQ TEST 2 PASSED: "PLT is high" blocked.\n');


// --- REQ TEST 3: PLT is Within Range Block ---
console.log('--- REQ TEST 3: PLT is Within Range Block ---');
const reqTest3Response = {
  summary: "PLT is within the reference range.",
  overallStatus: 'Needs Review',
  observations: []
};
const res3 = sanitizeAndValidateAiSummary(reqTest3Response, labValues, 'Laboratory', 'PLT 19');
console.log(`Sanitized Summary 3: "${res3.summary}"`);
assert.ok(!/within/i.test(res3.summary), 'PLT within range classification MUST be blocked for unknown status');
console.log('✅ REQ TEST 3 PASSED: "PLT is within the reference range" blocked.\n');


// --- REQ TEST 4: Grounded Within-Range Parameter Allowed ---
console.log('--- REQ TEST 4: Grounded Within-Range Parameter Allowed ---');
const reqTest4Response = {
  summary: "Random blood sugar is within the reference range provided in the report (80-140 mg/dL).",
  overallStatus: 'Normal',
  observations: []
};
const res4 = sanitizeAndValidateAiSummary(reqTest4Response, labValues, 'Laboratory', 'RANDOM BLOOD SUGAR 126.8 80-140');
console.log(`Sanitized Summary 4: "${res4.summary}"`);
assert.ok(res4.summary.includes('within the reference range provided in the report (80-140 mg/dL)'), 'Grounded within range parameter must be kept');
console.log('✅ REQ TEST 4 PASSED: Grounded Within Range statement preserved.\n');


// --- REQ TEST 5: Mixed Sentence Cleaning ---
console.log('--- REQ TEST 5: Mixed Sentence Cleaning ---');
const reqTest5Response = {
  summary: "Random blood sugar is within the reference range provided in the report (80-140 mg/dL), while PLT is slightly elevated.",
  overallStatus: 'Needs Review',
  observations: []
};
const res5 = sanitizeAndValidateAiSummary(reqTest5Response, labValues, 'Laboratory', 'RANDOM BLOOD SUGAR 126.8 80-140 PLT 19');
console.log(`Sanitized Summary 5: "${res5.summary}"`);
assert.ok(res5.summary.includes('Random blood sugar is within the reference range provided in the report (80-140 mg/dL)'), 'Grounded Random Blood Sugar portion MUST be kept');
assert.ok(!/elevated/i.test(res5.summary), 'Unsupported PLT elevation portion MUST be stripped');
console.log('✅ REQ TEST 5 PASSED: Mixed sentence cleaned (grounded sugar kept, unsupported PLT elevation stripped).\n');


// --- REQ TEST 6: Metadata & Non-Classification Statements Preservation ---
console.log('--- REQ TEST 6: Metadata & Non-Classification Statements Preservation ---');
const reqTest6Response = {
  summary: "Patient Adarsh Gautam was tested at Tej Diagnostic Center. No reference range was provided for PLT.",
  overallStatus: 'Needs Review',
  observations: []
};
const res6 = sanitizeAndValidateAiSummary(reqTest6Response, labValues, 'Laboratory', 'PLT 19');
console.log(`Sanitized Summary 6: "${res6.summary}"`);
assert.ok(res6.summary.includes('Patient Adarsh Gautam was tested at Tej Diagnostic Center.'), 'Metadata MUST be kept');
assert.ok(res6.summary.includes('No reference range was provided for PLT.'), '"No reference range provided" statement MUST be kept');
console.log('✅ REQ TEST 6 PASSED: Metadata & "no reference range provided" statements preserved intact.\n');


// --- REQ TEST 7: E.S.R. Raw OCR Context Blocking ---
console.log('--- REQ TEST 7: E.S.R. Raw OCR Context Blocking ---');
const reqTest7Response = {
  summary: "RANDOM BLOOD SUGAR is within the reference range provided in the report (80-140 mg/dL). E.S.R. is within normal range.",
  overallStatus: 'Needs Review',
  observations: [
    { text: "E.S.R. is 12 mm/hr within biological reference range (0-15 mm/hr)", parameterName: "E.S.R.", value: "12" }
  ]
};
const res7 = sanitizeAndValidateAiSummary(reqTest7Response, labValues, 'Laboratory', 'E.S.R. 12 mm/hr (0-15)');
console.log(`Sanitized Summary 7: "${res7.summary}"`);
assert.ok(!/E\.?S\.?R\.?[^.]*?within/i.test(res7.summary), 'E.S.R. classification MUST be blocked');
assert.strictEqual(res7.observations.length, 0, 'E.S.R. observation MUST be stripped');
console.log('✅ REQ TEST 7 PASSED: E.S.R. completely blocked.\n');


// --- REQ TEST 8: All 10 Unknown Range Parameters Blocking Test ---
console.log('--- REQ TEST 8: All 10 Unknown Range Parameters Blocking Test ---');
const reqTest8Response = {
  summary: "HCT is high, MCV is low, MCH is normal, MCHC is elevated, RDWCV is abnormal, NEUT% is within range, LYMPH% is outside range, MONO% is increased, BASO% is decreased, and PLT is slightly elevated.",
  overallStatus: 'Needs Review',
  observations: []
};
const res8 = sanitizeAndValidateAiSummary(reqTest8Response, labValues, 'Laboratory', 'HCT MCV MCH MCHC RDWCV NEUT% LYMPH% MONO% BASO% PLT');
console.log(`Sanitized Summary 8: "${res8.summary}"`);
assert.ok(!/\b(high|low|normal|elevated|abnormal|within|outside|increased|decreased)\b/i.test(res8.summary), 'All range/clinical classifications for all 10 unknown range parameters MUST be blocked');
console.log('✅ REQ TEST 8 PASSED: All 10 unknown-range parameters blocked from any range classification!\n');


console.log('================================================================');
console.log('🎉 ALL 8 REQ AI SUMMARY GROUNDING REGRESSION TESTS PASSED!');
console.log('================================================================\n');
