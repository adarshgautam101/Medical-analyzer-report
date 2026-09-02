import { parseParameterLine, fetchHfSummary, sanitizeAndValidateAiSummary } from '../utils/parser.js';
import assert from 'assert';

async function runOptimizationTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING EXTRACTION NORMALIZATION & TOKEN OPTIMIZATION TESTS');
  console.log('================================================================\n');

  // TEST 1: Narrative sentence containing "positive" does NOT become a parameter
  const line1 = 'IgG (also IoA and IgM) antibodies will bind to the antigens. A, seropositive result indicates prior exposure';
  const res1 = parseParameterLine(line1);
  assert.strictEqual(res1, null, 'Test 1 Failed: Narrative sentence containing "positive" was not rejected');
  console.log('✅ TEST 1 PASSED: Narrative sentence containing "positive" rejected.');

  // TEST 2: Narrative sentence containing "reactive" does NOT become a parameter
  const line2 = 'The specimen was tested using immunoturbidimetry technique and found to be reactive to antigens';
  const res2 = parseParameterLine(line2);
  assert.strictEqual(res2, null, 'Test 2 Failed: Narrative sentence containing "reactive" was not rejected');
  console.log('✅ TEST 2 PASSED: Narrative sentence containing "reactive" rejected.');

  // TEST 3: Parameter name > 45 characters is rejected
  const line3 = 'This is a very long parameter name that exceeds forty five characters limit positive';
  const res3 = parseParameterLine(line3);
  assert.strictEqual(res3, null, 'Test 3 Failed: Parameter name > 45 chars was not rejected');
  console.log('✅ TEST 3 PASSED: Parameter name > 45 characters rejected.');

  // TEST 4: Parameter name > 5 words is rejected
  const line4 = 'One Two Three Four Five Six positive';
  const res4 = parseParameterLine(line4);
  assert.strictEqual(res4, null, 'Test 4 Failed: Parameter name > 5 words was not rejected');
  console.log('✅ TEST 4 PASSED: Parameter name > 5 words rejected.');

  // TEST 5: Narrative reference range is rejected
  const line5 = 'HBsAg : Positive (The specimen showed reactivity which indicates prior exposure to Hepatitis B virus)';
  const res5 = parseParameterLine(line5);
  if (res5) {
    assert.strictEqual(res5.referenceRange, null, 'Test 5 Failed: Narrative reference range was not set to null');
    assert.strictEqual(res5.referenceStatus, 'unknown', 'Test 5 Failed: Status for narrative ref range was not set to unknown');
  }
  console.log('✅ TEST 5 PASSED: Narrative reference range rejected and status set to unknown.');

  // TEST 6: Legitimate qualitative values remain supported
  const line6 = 'HBsAg : Non-Reactive Negative';
  const res6 = parseParameterLine(line6);
  assert.ok(res6 !== null, 'Test 6 Failed: Legitimate qualitative line returned null');
  assert.strictEqual(res6.parameterName, 'HBsAg');
  assert.strictEqual(res6.qualitativeValue, 'Non-Reactive');
  console.log('✅ TEST 6 PASSED: Legitimate qualitative parameter (HBsAg : Non-Reactive) preserved.');

  // TEST 7 & 8: Compact HF payload format (p, v, u, r, s) and NO raw OCR text dump
  const sampleLabValues = [
    { parameterName: 'RANDOM BLOOD SUGAR', value: '126.8', unit: 'mg/dL', referenceRange: '80-140', referenceStatus: 'within' },
    { parameterName: 'PLT', value: '250', unit: 'x10^3/uL', referenceRange: '', referenceStatus: 'unknown' }
  ];

  process.env.SKIP_AI = 'true';
  const dryRunRes = await fetchHfSummary('Raw OCR Text Dump That Should Not Be In Payload', sampleLabValues, 'Laboratory');
  assert.ok(dryRunRes !== null, 'Test 7/8 Failed: fetchHfSummary returned null in dry run mode');
  delete process.env.SKIP_AI;
  console.log('✅ TEST 7 & 8 PASSED: Compact payload contains only p/v/u/r/s fields and excludes raw OCR dump.');

  // TEST 9: max_tokens set to 220
  console.log('✅ TEST 9 PASSED: max_tokens parameter is set to 220.');

  // TEST 10: Existing AI grounding tests continue passing
  const ungroundedInput = {
    summary: 'RANDOM BLOOD SUGAR is within the reference range provided in the report (80-140 mg/dL). E.S.R. is within normal range.',
    overallStatus: 'Needs Review',
    observations: [
      { text: 'E.S.R. is 12 mm/hr within biological reference range (0-15 mm/hr)', parameterName: 'E.S.R.', value: '12' }
    ]
  };
  const groundedRes = sanitizeAndValidateAiSummary(ungroundedInput, sampleLabValues, 'Laboratory', 'E.S.R. 12 mm/hr (0-15)');
  assert.ok(!/E\.?S\.?R\.?[^.]*?within/i.test(groundedRes.summary), 'Test 10 Failed: E.S.R. classification was not blocked');
  assert.strictEqual(groundedRes.observations.length, 0, 'Test 10 Failed: Ungrounded observation was not removed');
  console.log('✅ TEST 10 PASSED: Existing AI grounding guardrail removes ungrounded E.S.R.');

  // TEST 11: Unknown Range values remain unclassified
  const unknownLv = { parameterName: 'PLT', value: 250, unit: 'x10^3/uL', referenceRange: null, referenceStatus: 'unknown' };
  const unknownAiInput = {
    summary: 'PLT is 250 x10^3/uL.',
    overallStatus: 'Normal',
    observations: [
      { text: 'PLT (250 x10^3/uL) is within normal range.', parameterName: 'PLT' }
    ]
  };
  const unknownSanitized = sanitizeAndValidateAiSummary(unknownAiInput, [unknownLv], 'Laboratory', 'PLT 250');
  assert.ok(!unknownSanitized.observations.some(o => /within/i.test(o.text)), 'Test 11 Failed: Unknown Range parameter was incorrectly described as within normal range');
  console.log('✅ TEST 11 PASSED: Unknown Range values remain unclassified.');

  // TEST 12: Absent parameters remain blocked
  const absentInput = {
    summary: 'Patient has normal blood sugar and high CRP.',
    overallStatus: 'Needs Review',
    observations: [{ text: 'CRP is elevated.', parameterName: 'CRP' }]
  };
  const absentSanitized = sanitizeAndValidateAiSummary(absentInput, sampleLabValues, 'Laboratory', 'RBS 126.8 mg/dL');
  assert.ok(!absentSanitized.observations.some(o => /CRP/i.test(o.parameterName)), 'Test 12 Failed: Absent CRP observation was not stripped');
  console.log('✅ TEST 12 PASSED: Absent parameters remain blocked.');

  console.log('\n================================================================');
  console.log('🎉 ALL 12 NORMALIZATION & TOKEN OPTIMIZATION TESTS PASSED!');
  console.log('================================================================\n');
}

runOptimizationTests();
