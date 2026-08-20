import assert from 'assert';
import { parseParameterLine, preprocessOcrLine } from '../utils/parser.js';

console.log('========================================');
console.log('RUNNING CLINICAL EXTRACTION AUTOMATED TESTS');
console.log('========================================\n');

// Test 1: "4.1?" -> 4.1
{
  const line = '@ Albumin 4.1? g/dL 3.55.2';
  const result = parseParameterLine(line);
  assert.ok(result, 'Test 1 Failed: Line should be parsed');
  assert.strictEqual(result.value, 4.1, 'Test 1 Failed: value should be 4.1');
  assert.strictEqual(result.unit, 'g/dL', 'Test 1 Failed: unit should be g/dL');
  assert.strictEqual(result.referenceRange, '3.5 - 5.2', 'Test 1 Failed: range should be 3.5 - 5.2');
  assert.strictEqual(result.sourceText, line, 'Test 1 Failed: sourceText must be exact raw OCR line');
  assert.strictEqual(result.evidenceSource, 'deterministic OCR normalization');
  console.log('✅ Test 1 Passed: "@ Albumin 4.1? g/dL 3.55.2" -> value: 4.1, range: "3.5 - 5.2"');
}

// Test 2: "0. 600" -> 0.600 & "CSF 196 Index..." must not produce value 196
{
  const line = "‘ CSF 196 Index (Calculated) 0. 600 Index 028- 056 ' .";
  const result = parseParameterLine(line);
  assert.ok(result, 'Test 2 Failed: Line should be parsed');
  assert.notStrictEqual(result.value, 196, 'Test 2 Failed: value MUST NOT be 196');
  assert.strictEqual(result.value, 0.6, 'Test 2 Failed: value should be 0.6');
  assert.strictEqual(result.parameterName, 'CSF IgG Index', 'Test 2 Failed: parameterName should be CSF IgG Index');
  assert.strictEqual(result.unit, 'Index', 'Test 2 Failed: unit should be Index');
  assert.strictEqual(result.referenceRange, '0.28 - 0.56', 'Test 2 Failed: range should be 0.28 - 0.56');
  assert.strictEqual(result.sourceText, line, 'Test 2 Failed: sourceText must be exact raw OCR line');
  assert.strictEqual(result.evidenceSource, 'deterministic OCR normalization');
  console.log('✅ Test 2 Passed: "CSF 196 Index..." -> value: 0.6 (not 196), unit: "Index", range: "0.28 - 0.56"');
}

// Test 3: Trailing OCR noise "r" must not become a unit
{
  const line = 'Albumin Index (Calculated) 6.31 0.0-9. 0 r';
  const result = parseParameterLine(line);
  assert.ok(result, 'Test 3 Failed: Line should be parsed');
  assert.strictEqual(result.value, 6.31, 'Test 3 Failed: value should be 6.31');
  assert.strictEqual(result.unit, '', 'Test 3 Failed: unit MUST NOT be "r" or noise');
  assert.strictEqual(result.referenceRange, '0.0 - 9.0', 'Test 3 Failed: range should be 0.0 - 9.0');
  assert.strictEqual(result.sourceText, line, 'Test 3 Failed: sourceText must be exact raw OCR line');
  console.log('✅ Test 3 Passed: Trailing noise "r" rejected as unit (unit: "")');
}

// Test 4: Split multi-line IgG/CSF result reconstruction
{
  const prevLine = 'lgG, csr ng ,.';
  const currentLine = 'lCSFJmmunotur-bidlmetrv) 3.2 mg/dL 0.8 - 4.5';
  const result = parseParameterLine(currentLine, '', prevLine);
  assert.ok(result, 'Test 4 Failed: Multi-line should be parsed');
  assert.strictEqual(result.parameterName, 'IgG, CSF', 'Test 4 Failed: paramName should be IgG, CSF');
  assert.strictEqual(result.value, 3.2, 'Test 4 Failed: value should be 3.2');
  assert.strictEqual(result.unit, 'mg/dL', 'Test 4 Failed: unit should be mg/dL');
  assert.strictEqual(result.referenceRange, '0.8 - 4.5', 'Test 4 Failed: range should be 0.8 - 4.5');
  assert.strictEqual(result.evidenceSource, 'multi-line reconstruction');
  assert.strictEqual(result.sourceText, `${prevLine.trim()}\n${currentLine.trim()}`, 'Test 4 Failed: sourceText must combine raw lines');
  console.log('✅ Test 4 Passed: Split multi-line IgG/CSF reconstructed with evidenceSource = "multi-line reconstruction"');
}

// Test 5: Administrative numbers MUST be rejected
{
  const adminLines = [
    'Mall, Mumbai-70',
    'Reg No. 2009/09/339',
    'Age- 24 Year(s) Sex- M',
    'Tel: 9820098200',
    'Collected: 26/10/2023 06:29 AM',
    'Page 1 of 3'
  ];

  for (const line of adminLines) {
    const result = parseParameterLine(line);
    assert.strictEqual(result, null, `Test 5 Failed: Administrative line "${line}" should be rejected (returned null)`);
  }
  console.log('✅ Test 5 Passed: All administrative lines rejected');
}

// Test 6: Unparseable range noise must not be manufactured into standard ranges
{
  const line = 'IgG-Albumin Ratio (CSF) 0.130 0.0902 5';
  const result = parseParameterLine(line);
  assert.ok(result, 'Test 6 Failed: Line should be parsed');
  assert.strictEqual(result.value, 0.13, 'Test 6 Failed: value should be 0.13');
  assert.strictEqual(result.unit, '', 'Test 6 Failed: unit should be empty string');
  assert.strictEqual(result.referenceRange, '', 'Test 6 Failed: referenceRange MUST NOT be manufactured into < 0.25');
  assert.strictEqual(result.referenceStatus, 'unknown', 'Test 6 Failed: referenceStatus should be unknown');
  console.log('✅ Test 6 Passed: Unparseable range noise rejected without manufacturing manufactured ranges');
}

console.log('\n========================================');
console.log('ALL AUTOMATED EXTRACTION TESTS PASSED!');
console.log('========================================\n');
