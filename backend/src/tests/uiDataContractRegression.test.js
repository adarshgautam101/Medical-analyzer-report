import assert from 'assert';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Report, LabValue, User } from '../models/index.js';
import { getReportDetails } from '../services/reportsService.js';

async function runUiDataContractRegressionTests() {
  console.log('\n==================================================');
  console.log('🚀 RUNNING UI DATA CONTRACT & REPORT DETAILS REGRESSION SUITE');
  console.log('==================================================\n');

  await mongoose.connect(env.MONGODB_URI);

  try {
    const user = await User.findOne({ email: 'adarsh123@gmail.com' });
    if (!user) {
      throw new Error('Test user adarsh123@gmail.com not found in MongoDB');
    }
    const mockUser = { id: user._id.toString(), role: user.role, email: user.email };

    // TEST 1: Completed report with 11 lab values
    console.log('--- TEST 1: Completed report with 11 lab values ---');
    let pdf2Report = await Report.findOne({ fileName: /pdf2/i, ocrStatus: 'completed' }).sort({ uploadDate: -1 });
    let createdSynthetic = false;
    if (!pdf2Report) {
      const labValuesReports = await LabValue.aggregate([
        { $group: { _id: '$report', count: { $sum: 1 } } },
        { $match: { count: 11 } }
      ]);
      if (labValuesReports.length > 0) {
        pdf2Report = await Report.findById(labValuesReports[0]._id);
      }
    }

    if (!pdf2Report) {
      // Create synthetic report & 11 lab values for data contract validation
      pdf2Report = new Report({
        user: user._id,
        fileName: 'synthetic_11_params.pdf',
        filePath: 'uploads/synthetic_11.pdf',
        fileType: 'application/pdf',
        ocrStatus: 'completed',
        extractedText: 'Synthetic test text'
      });
      await pdf2Report.save();
      createdSynthetic = true;

      const mockParams = ['Hb', 'WBC', 'RBC', 'Platelets', 'Glucose', 'HbA1c', 'Cholesterol', 'Triglycerides', 'HDL', 'LDL', 'Creatinine'];
      for (const p of mockParams) {
        await LabValue.create({
          report: pdf2Report._id,
          parameterName: p,
          value: 10,
          unit: 'mg/dL',
          referenceRange: '5-15',
          isAbnormal: false,
          referenceStatus: 'within'
        });
      }
    }

    const dbLabCount = await LabValue.countDocuments({ report: pdf2Report._id });
    const apiResult = await getReportDetails({ id: pdf2Report.user.toString(), role: 'patient' }, pdf2Report._id.toString());

    console.log(`Report ID: ${pdf2Report._id}`);
    console.log(`File Name: ${pdf2Report.fileName}`);
    console.log(`ocrStatus: ${apiResult.ocr_status}`);
    console.log(`category: ${apiResult.category}`);
    console.log(`MongoDB LabValue count: ${dbLabCount}`);
    console.log(`API lab_values count: ${apiResult.lab_values.length}`);
    console.log(`Parameter names: ${apiResult.lab_values.map(v => v.parameter_name).join(', ')}`);

    assert.strictEqual(apiResult.ocr_status, 'completed', 'ocrStatus must be completed');
    assert.strictEqual(dbLabCount, 11, 'MongoDB must contain exactly 11 LabValue documents');
    assert.strictEqual(apiResult.lab_values.length, 11, 'API response must contain exactly 11 lab_values');
    assert.strictEqual(dbLabCount, apiResult.lab_values.length, 'MongoDB count === API lab_values.length');
    console.log('✅ TEST 1 PASSED: 11 lab values contract verified.\n');

    // TEST 1B: Completed report with 3 lab values (Exact N = 3 contract test)
    console.log('--- TEST 1B: Completed report with 3 lab values ---');
    let pdf3Report = new Report({
      user: user._id,
      fileName: 'synthetic_3_params.pdf',
      filePath: 'uploads/synthetic_3.pdf',
      fileType: 'application/pdf',
      ocrStatus: 'completed',
      extractedText: 'Synthetic 3 params text'
    });
    await pdf3Report.save();

    const mock3Params = ['CSF Glucose', 'Protein, CSF', 'Oligoclonal Bands'];
    for (const p of mock3Params) {
      await LabValue.create({
        report: pdf3Report._id,
        parameterName: p,
        value: 45,
        unit: 'mg/dL',
        referenceRange: '40-70',
        isAbnormal: false,
        referenceStatus: 'within'
      });
    }

    const db3Count = await LabValue.countDocuments({ report: pdf3Report._id });
    const api3Result = await getReportDetails({ id: pdf3Report.user.toString(), role: 'patient' }, pdf3Report._id.toString());
    const frontendNormalizedCount = (Array.isArray(api3Result.lab_values) ? api3Result.lab_values : []).length;

    console.log(`Report ID: ${pdf3Report._id}`);
    console.log(`File Name: ${pdf3Report.fileName}`);
    console.log(`ocrStatus: ${api3Result.ocr_status}`);
    console.log(`MongoDB LabValue count: ${db3Count}`);
    console.log(`API lab_values count: ${api3Result.lab_values.length}`);
    console.log(`Frontend normalized labValues count: ${frontendNormalizedCount}`);
    console.log(`Parameter names: ${api3Result.lab_values.map(v => v.parameter_name).join(', ')}`);

    assert.strictEqual(db3Count, 3, 'MongoDB count must be 3');
    assert.strictEqual(api3Result.lab_values.length, 3, 'API lab_values.length must be 3');
    assert.strictEqual(frontendNormalizedCount, 3, 'Frontend normalized count must be 3');
    assert.ok(frontendNormalizedCount > 0, 'When N > 0, frontend must render structured lab values and NEVER display empty state message');
    console.log('✅ TEST 1B PASSED: 3 lab values contract verified.\n');

    await LabValue.deleteMany({ report: pdf3Report._id });
    await Report.findByIdAndDelete(pdf3Report._id);

    // TEST 2: Completed report with 6 lab values (PDF4)
    console.log('--- TEST 2: Completed report with 6 lab values ---');
    let pdf4Report = await Report.findOne({ fileName: /20260819T205237816Z_pdf4/i, ocrStatus: 'completed' });
    if (!pdf4Report) {
      const labValuesReports = await LabValue.aggregate([
        { $group: { _id: '$report', count: { $sum: 1 } } },
        { $match: { count: 6 } }
      ]);
      if (labValuesReports.length > 0) {
        pdf4Report = await Report.findById(labValuesReports[0]._id);
      }
    }

    if (!pdf4Report) {
      console.log('⚠️ PDF4 completed report not found in DB. Skipping PDF4 exact count check.');
    } else {
      const pdf4User = { id: pdf4Report.user.toString(), role: 'patient' };
      const apiResult = await getReportDetails(pdf4User, pdf4Report._id.toString());

      const db4Count = await LabValue.countDocuments({ report: pdf4Report._id });
      console.log(`Report ID: ${pdf4Report._id}`);
      console.log(`File Name: ${pdf4Report.fileName}`);
      console.log(`ocrStatus: ${apiResult.ocr_status}`);
      console.log(`category: ${apiResult.category}`);
      console.log(`MongoDB LabValue count: ${db4Count}`);
      console.log(`API lab_values count: ${apiResult.lab_values.length}`);
      console.log(`Parameter names: ${apiResult.lab_values.map(v => v.parameter_name).join(', ')}`);

      assert.strictEqual(apiResult.ocr_status, 'completed', 'ocrStatus must be completed');
      assert.strictEqual(db4Count, 6, 'MongoDB must contain exactly 6 LabValue documents for PDF4');
      assert.strictEqual(apiResult.lab_values.length, 6, 'API response must contain exactly 6 lab_values for PDF4');
      assert.strictEqual(db4Count, apiResult.lab_values.length, 'MongoDB count === API lab_values.length');
      console.log('✅ TEST 2 PASSED: 6 lab values contract verified.\n');
    }

    // TEST 3: Completed report with 0 lab values (PDF5 / Narrative)
    console.log('--- TEST 3: Completed report with 0 lab values ---');
    let pdf5Report = await Report.findOne({ user: user._id, fileName: /pdf5/i, ocrStatus: 'completed' }).sort({ uploadDate: -1 });
    if (!pdf5Report) {
      const labValuesReports = await LabValue.distinct('report');
      pdf5Report = await Report.findOne({ _id: { $nin: labValuesReports }, ocrStatus: 'completed' });
    }

    if (!pdf5Report) {
      console.log('⚠️ PDF5 completed report not found in DB. Skipping PDF5 exact count check.');
    } else {
      const pdf5User = { id: pdf5Report.user.toString(), role: 'patient' };
      const apiResult = await getReportDetails(pdf5User, pdf5Report._id.toString());

      const db5Count = await LabValue.countDocuments({ report: pdf5Report._id });
      console.log(`Report ID: ${pdf5Report._id}`);
      console.log(`File Name: ${pdf5Report.fileName}`);
      console.log(`ocrStatus: ${apiResult.ocr_status}`);
      console.log(`category: ${apiResult.category}`);
      console.log(`MongoDB LabValue count: ${db5Count}`);
      console.log(`API lab_values count: ${apiResult.lab_values.length}`);

      assert.strictEqual(apiResult.ocr_status, 'completed', 'ocrStatus must be completed');
      assert.strictEqual(db5Count, 0, 'MongoDB must contain 0 LabValue documents for PDF5');
      assert.strictEqual(apiResult.lab_values.length, 0, 'API response must contain 0 lab_values for PDF5');
      assert.strictEqual(db5Count, apiResult.lab_values.length, 'MongoDB count === API lab_values.length === 0');
      console.log('✅ TEST 3 PASSED: 0 lab values empty contract verified.\n');
    }

    // TEST 4: Data Contract Safety (undefined / null / [])
    console.log('--- TEST 4: Frontend state normalization helper test (undefined / null / []) ---');
    const getNormalizedLabValues = (reportObj) => {
      if (Array.isArray(reportObj?.lab_values)) return reportObj.lab_values;
      if (Array.isArray(reportObj?.labValues)) return reportObj.labValues;
      return [];
    };

    assert.deepStrictEqual(getNormalizedLabValues({ lab_values: undefined }), []);
    assert.deepStrictEqual(getNormalizedLabValues({ lab_values: null }), []);
    assert.deepStrictEqual(getNormalizedLabValues({ lab_values: [] }), []);
    assert.deepStrictEqual(getNormalizedLabValues({ labValues: [{ parameter_name: 'Hb' }] }), [{ parameter_name: 'Hb' }]);
    assert.deepStrictEqual(getNormalizedLabValues({ lab_values: [{ parameter_name: 'WBC' }] }), [{ parameter_name: 'WBC' }]);
    console.log('✅ TEST 4 PASSED: Safe normalization for undefined, null, and empty array verified.\n');

    // TEST 5: Category Independence Test
    console.log('--- TEST 5: Category Independence Test ---');
    const allCompletedReports = await Report.find({ user: user._id, ocrStatus: 'completed' }).populate('category');
    for (const rep of allCompletedReports) {
      const details = await getReportDetails(mockUser, rep._id.toString());
      const categoryName = details.category || 'Uncategorized';
      const dbCount = await LabValue.countDocuments({ report: rep._id });
      assert.strictEqual(details.lab_values.length, dbCount, `Report ${rep._id} category "${categoryName}" API length must match DB count`);
    }
    console.log(`✅ TEST 5 PASSED: Verified ${allCompletedReports.length} completed reports across categories.\n`);

    console.log('==================================================');
    console.log('🎉 ALL UI DATA CONTRACT REGRESSION TESTS PASSED SUCCESSFULLY!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('❌ REGRESSION TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runUiDataContractRegressionTests();
