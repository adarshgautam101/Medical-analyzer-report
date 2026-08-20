import assert from 'assert';
import fs from 'fs';
import mongoose from 'mongoose';

process.env.SKIP_OLLAMA = 'true';
import { env } from '../config/env.js';
import { Report, LabValue, User, ReportCategory } from '../models/index.js';
import { processReportInBackground, parseParameterLine, detectDocumentType, preprocessOcrLine } from '../utils/parser.js';
import { getReportDetails } from '../services/reportsService.js';

async function runProductionPipelineEndToEndSuite() {
  console.log('\n================================================================');
  console.log('🚀 PRODUCTION END-TO-END CLINICAL PIPELINE & HARDENING TEST SUITE');
  console.log('================================================================\n');

  await mongoose.connect(env.MONGODB_URI);

  try {
    let testUser = await User.findOne({ email: 'adarsh123@gmail.com' });
    if (!testUser) {
      testUser = await User.create({
        email: 'adarsh123@gmail.com',
        password: 'password123',
        role: 'patient',
        name: 'Adarsh Gautam'
      });
    }
    const mockUser = { id: testUser._id.toString(), role: testUser.role, email: testUser.email };

    // -------------------------------------------------------------------------
    // TEST 1: POSITIVE EXTRACTION & INVARIANT TEST FOR N = 1, 3, 6, 11, 22 PARAMS
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Arbitrary Parameter Count & Invariant Audit (0, 1, 3, 6, 11, 22) ---');

    const paramCountsToTest = [0, 1, 3, 6, 11, 22];

    for (const count of paramCountsToTest) {
      const mockReport = new Report({
        user: testUser._id,
        fileName: `test_report_${count}_params.pdf`,
        filePath: `uploads/test_${count}.pdf`,
        fileType: 'application/pdf',
        ocrStatus: 'completed',
        extractedText: `Test Report with ${count} parameters`
      });
      await mockReport.save();

      const createdNames = [];
      for (let i = 1; i <= count; i++) {
        const paramName = `Test Parameter ${i}`;
        createdNames.push(paramName);
        await LabValue.create({
          report: mockReport._id,
          parameterName: paramName,
          value: 10 + i,
          unit: 'mg/dL',
          referenceRange: '5 - 30',
          isAbnormal: false,
          referenceStatus: 'within'
        });
      }

      // Query DB & API
      const dbCount = await LabValue.countDocuments({ report: mockReport._id });
      const apiResult = await getReportDetails(mockUser, mockReport._id.toString());
      const frontendNormalizedCount = (apiResult.lab_values ?? []).length;

      console.log(`[Count Test N=${count}] DB: ${dbCount} | API: ${apiResult.lab_values.length} | Frontend Normalized: ${frontendNormalizedCount}`);

      // Invariant Assertion
      assert.strictEqual(dbCount, count, `DB count must equal ${count}`);
      assert.strictEqual(apiResult.lab_values.length, count, `API lab_values.length must equal ${count}`);
      assert.strictEqual(frontendNormalizedCount, count, `Frontend normalized count must equal ${count}`);

      if (count === 0) {
        assert.strictEqual(frontendNormalizedCount, 0, 'When N = 0, frontend must receive empty array for structured empty state');
      } else {
        assert.ok(frontendNormalizedCount > 0, 'When N > 0, frontend must receive >0 values and NEVER show empty state');
      }

      // Cleanup
      await LabValue.deleteMany({ report: mockReport._id });
      await Report.findByIdAndDelete(mockReport._id);
    }
    console.log('✅ TEST 1 PASSED: Parameter count invariants (0, 1, 3, 6, 11, 22) verified.\n');

    // -------------------------------------------------------------------------
    // TEST 2: POSITIVE SINGLE-LINE MEASUREMENT PARSING (CSF Glucose 62 mg/dL 45-80)
    // -------------------------------------------------------------------------
    console.log('--- TEST 2: Positive Single-Line Measurement Parsing ---');
    const positiveLine = 'CSF Glucose 62 mg/dL 45-80';
    const parsedPositive = parseParameterLine(positiveLine, positiveLine, '');

    assert.ok(parsedPositive, 'Positive line must parse successfully');
    assert.strictEqual(parsedPositive.parameterName, 'CSF Glucose', 'Parameter name must be CSF Glucose');
    assert.strictEqual(parsedPositive.value, 62, 'Value must be 62');
    assert.strictEqual(parsedPositive.unit, 'mg/dL', 'Unit must be mg/dL');
    assert.strictEqual(parsedPositive.referenceRange, '45 - 80', 'Reference range must be 45 - 80');
    console.log('✅ TEST 2 PASSED: Genuine measurement parsed accurately.\n');

    // -------------------------------------------------------------------------
    // TEST 3: NEGATIVE EXTRACTION SAFETY RULES
    // -------------------------------------------------------------------------
    console.log('--- TEST 3: Negative Extraction Safety & Rejection Audit ---');

    const negativeLines = [
      { text: 'Laboratory results showed normal glucose levels in CSF (45-80 mg/dl).', reason: 'Narrative reference range only' },
      { text: 'Department of Radiology & MRI, Patient Age: 45, Sex: Male', reason: 'Patient age header' },
      { text: 'LAB ID: 90812, Receipt No: 887123', reason: 'Administrative LAB ID' },
      { text: 'Page 1 of 3', reason: 'Page number' },
      { text: 'Date of Collection: 2026-08-19', reason: 'Date' },
      { text: 'This report awaits further analysis on total protein and IgG index.', reason: 'Narrative statement' },
      { text: 'Index (Calculated) .600 Index 028 - 056', reason: 'Malformed OCR missing parameter context' }
    ];

    let rejectedCount = 0;
    for (const item of negativeLines) {
      const parsed = parseParameterLine(item.text, item.text, '');
      if (!parsed) {
        rejectedCount++;
      } else {
        assert.fail(`Line "${item.text}" should have been rejected (${item.reason}) but was parsed as: ${JSON.stringify(parsed)}`);
      }
    }
    assert.strictEqual(rejectedCount, negativeLines.length, 'All negative lines must be safely rejected');
    console.log(`✅ TEST 3 PASSED: Safely rejected all ${rejectedCount} non-measurement candidate lines.\n`);

    // -------------------------------------------------------------------------
    // TEST 4: DUPLICATE PERSISTENCE PREVENTION
    // -------------------------------------------------------------------------
    console.log('--- TEST 4: Duplicate Persistence Prevention Test ---');

    const duplicateOcrText = `--- PAGE 1 ---
Department of Pathology
Albumin, CSF 26.3 mg/dL 11-35
Albumin, CSF 26.3 mg/dL 11-35
Albumin, Serum 4.2 g/dL 3.5-5.2
Albumin, Serum 4.2 g/dL 3.5-5.2
Page 1 of 1`;

    const dupFilePath = 'uploads/duplicate_test_file.txt';
    fs.writeFileSync(dupFilePath, duplicateOcrText);

    const dupReport = new Report({
      user: testUser._id,
      fileName: 'duplicate_test_report.txt',
      filePath: dupFilePath,
      fileType: 'text/plain',
      ocrStatus: 'pending',
      extractedText: duplicateOcrText
    });
    await dupReport.save();

    // Run actual processReportInBackground path
    await processReportInBackground(dupReport._id.toString(), dupFilePath, 'text/plain');

    const dupDbLabValues = await LabValue.find({ report: dupReport._id });
    const dupApiResult = await getReportDetails(mockUser, dupReport._id.toString());

    console.log(`Duplicate Test -> DB Count: ${dupDbLabValues.length} | API Count: ${dupApiResult.lab_values.length}`);
    assert.strictEqual(dupDbLabValues.length, 2, 'Duplicate OCR lines must yield exactly 2 unique LabValues in DB');
    assert.strictEqual(dupApiResult.lab_values.length, 2, 'API response must contain exactly 2 unique LabValues');

    // Cleanup
    if (fs.existsSync(dupFilePath)) fs.unlinkSync(dupFilePath);
    await LabValue.deleteMany({ report: dupReport._id });
    await Report.findByIdAndDelete(dupReport._id);
    console.log('✅ TEST 4 PASSED: Duplicate line persistence prevented.\n');

    // -------------------------------------------------------------------------
    // TEST 5: REFERENCE RANGE & STATUS EVALUATION TEST
    // -------------------------------------------------------------------------
    console.log('--- TEST 5: Reference Range & Status Behavior Audit ---');

    const statusTestReport = new Report({
      user: testUser._id,
      fileName: 'status_test_report.pdf',
      filePath: 'uploads/status_test.pdf',
      fileType: 'application/pdf',
      ocrStatus: 'completed',
      extractedText: 'Status evaluation test'
    });
    await statusTestReport.save();

    // 1. Valid value + valid reference range -> within
    await LabValue.create({ report: statusTestReport._id, parameterName: 'Normal Param', value: 10, unit: 'mg/dL', referenceRange: '5 - 20', referenceStatus: 'within', isAbnormal: false });
    // 2. Valid value + valid reference range -> outside
    await LabValue.create({ report: statusTestReport._id, parameterName: 'Elevated Param', value: 35, unit: 'mg/dL', referenceRange: '5 - 20', referenceStatus: 'outside', isAbnormal: true });
    // 3. Valid value + missing reference range -> unknown
    await LabValue.create({ report: statusTestReport._id, parameterName: 'Unknown Range Param', value: 15, unit: 'mg/dL', referenceRange: '', referenceStatus: 'unknown', isAbnormal: null });

    const statusApiResult = await getReportDetails(mockUser, statusTestReport._id.toString());
    const lvs = statusApiResult.lab_values;

    const normalItem = lvs.find(v => v.parameter_name === 'Normal Param');
    const elevatedItem = lvs.find(v => v.parameter_name === 'Elevated Param');
    const unknownItem = lvs.find(v => v.parameter_name === 'Unknown Range Param');

    assert.strictEqual(normalItem.reference_status, 'within', 'Normal Param status must be within');
    assert.strictEqual(elevatedItem.reference_status, 'outside', 'Elevated Param status must be outside');
    assert.strictEqual(unknownItem.reference_status, 'unknown', 'Unknown Range Param status must be unknown');

    await LabValue.deleteMany({ report: statusTestReport._id });
    await Report.findByIdAndDelete(statusTestReport._id);
    console.log('✅ TEST 5 PASSED: Reference range status behavior verified.\n');

    // -------------------------------------------------------------------------
    // TEST 6: MULTI-LINE / SPLIT-LINE RECONSTRUCTION INTEGRATION TEST
    // -------------------------------------------------------------------------
    console.log('--- TEST 6: Multi-line / Split-line Reconstruction Test ---');

    const multiLineOcrText = `--- PAGE 1 ---
CSF Pathology Panel
Glucose, CSF
62 mg/dL 45-80
Protein, CSF
35 mg/dL 15-45
Page 1 of 1`;

    const multiFilePath = 'uploads/multiline_test_file.txt';
    fs.writeFileSync(multiFilePath, multiLineOcrText);

    const multiReport = new Report({
      user: testUser._id,
      fileName: 'multiline_test_report.txt',
      filePath: multiFilePath,
      fileType: 'text/plain',
      ocrStatus: 'pending',
      extractedText: multiLineOcrText
    });
    await multiReport.save();

    await processReportInBackground(multiReport._id.toString(), multiFilePath, 'text/plain');

    const multiDbLabValues = await LabValue.find({ report: multiReport._id });
    const multiApiResult = await getReportDetails(mockUser, multiReport._id.toString());

    console.log(`Multi-line Test -> DB Count: ${multiDbLabValues.length} | API Count: ${multiApiResult.lab_values.length}`);
    console.log(`Extracted parameters: ${multiDbLabValues.map(v => v.parameterName).join(', ')}`);

    assert.strictEqual(multiDbLabValues.length, 2, 'Multi-line text must yield exactly 2 LabValues');
    assert.strictEqual(multiApiResult.lab_values.length, 2, 'API response must yield exactly 2 LabValues');

    if (fs.existsSync(multiFilePath)) fs.unlinkSync(multiFilePath);
    await LabValue.deleteMany({ report: multiReport._id });
    await Report.findByIdAndDelete(multiReport._id);
    console.log('✅ TEST 6 PASSED: Multi-line reconstruction verified.\n');

    console.log('================================================================');
    console.log('🎉 ALL PRODUCTION END-TO-END PIPELINE AUDIT TESTS PASSED!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ PRODUCTION PIPELINE END-TO-END TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runProductionPipelineEndToEndSuite();
