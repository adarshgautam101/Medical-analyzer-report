import assert from 'assert';
import mongoose from 'mongoose';
import { processReportInBackground, isMedicalDocument, ocrQueue } from '../utils/parser.js';
import { Report, LabValue, User } from '../models/index.js';
import { env } from '../config/env.js';

async function runConcurrentOcrQueueTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING CONCURRENT OCR QUEUE & BACKGROUND CONCURRENCY SUITE');
  console.log('================================================================\n');

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log(' Connected to MongoDB');

    let user = await User.findOne({ email: 'test_concurrent_queue@example.com' });
    if (!user) {
      user = new User({
        fullName: 'Test Concurrent Queue User',
        email: 'test_concurrent_queue@example.com',
        passwordHash: 'hashed_password_123',
        role: 'patient'
      });
      await user.save();
    }

    console.log('--- TEST 1: 5 Concurrent Report Uploads & Queue Throttling ---');

    const docsText = [
      {
        fileName: 'concurrent_med_1.pdf',
        text: `PATIENT LABORATORY REPORT\nPatient Name: Patient One\nHaemoglobin 13.5 g/dL 12.0 - 16.0\nGlucose 95 mg/dL 70 - 99`
      },
      {
        fileName: 'concurrent_med_2.pdf',
        text: `PATIENT LABORATORY REPORT\nPatient Name: Patient Two\nWBC 6.5 10^3/uL 4.0 - 11.0\nPlatelets 250 10^3/uL 150 - 450`
      },
      {
        fileName: 'concurrent_mri.pdf',
        text: `BRAIN MRI EXAMINATION REPORT\nPatient Name: Patient Three\nFINDINGS: Brain parenchyma demonstrates normal signal intensity. No acute stroke or mass effect.`
      },
      {
        fileName: 'concurrent_resume.pdf',
        text: `CURRICULUM VITAE\nJohn Smith\nSoftware Engineer\nEDUCATION: Computer Science\nEXPERIENCE: Developer (2020-2026)\nSKILLS: Node.js, Python, MongoDB`
      },
      {
        fileName: 'concurrent_med_3.pdf',
        text: `PATIENT LABORATORY REPORT\nPatient Name: Patient Five\nCreatinine 0.9 mg/dL 0.6 - 1.2\nTSH 2.1 uIU/mL 0.4 - 4.2`
      }
    ];

    const reports = [];
    for (const d of docsText) {
      const r = new Report({
        user: user._id,
        fileName: d.fileName,
        filePath: `uploads/mock_${d.fileName}`,
        fileType: 'application/pdf',
        ocrStatus: 'pending',
        extractedText: d.text
      });
      await r.save();
      reports.push(r);
    }

    console.log(` Created ${reports.length} pending reports in MongoDB.`);
    console.log(' Launching 5 background processing jobs SIMULTANEOUSLY...\n');

    const jobPromises = reports.map(r => processReportInBackground(r._id, null, 'application/pdf'));

    await Promise.all(jobPromises);

    console.log(' All 5 concurrent background jobs completed execution.\n');

    // Verify outcomes for each report
    const r1 = await Report.findById(reports[0]._id);
    const r2 = await Report.findById(reports[1]._id);
    const r3 = await Report.findById(reports[2]._id);
    const r4 = await Report.findById(reports[3]._id); // Resume -> should be DELETED (null)
    const r5 = await Report.findById(reports[4]._id);

    console.log(`Report 1 (Medical 1) status: ${r1 ? r1.ocrStatus : 'NULL'}`);
    console.log(`Report 2 (Medical 2) status: ${r2 ? r2.ocrStatus : 'NULL'}`);
    console.log(`Report 3 (MRI) status: ${r3 ? r3.ocrStatus : 'NULL'}`);
    console.log(`Report 4 (Resume) state: ${r4 ? 'EXISTS (FAILED)' : 'NULL (DELETED CLEANLY)'}`);
    console.log(`Report 5 (Medical 3) status: ${r5 ? r5.ocrStatus : 'NULL'}`);

    assert.ok(r1, 'Report 1 must exist');
    assert.strictEqual(r1.ocrStatus, 'completed', 'Report 1 must be completed');

    assert.ok(r2, 'Report 2 must exist');
    assert.strictEqual(r2.ocrStatus, 'completed', 'Report 2 must be completed');

    assert.ok(r3, 'Report 3 must exist');
    assert.strictEqual(r3.ocrStatus, 'completed', 'Report 3 (MRI) must be completed');

    assert.strictEqual(r4, null, 'Report 4 (Resume) must be cleanly deleted from DB');

    assert.ok(r5, 'Report 5 must exist');
    assert.strictEqual(r5.ocrStatus, 'completed', 'Report 5 must be completed');

    const labValues1 = await LabValue.find({ report: reports[0]._id });
    const labValues2 = await LabValue.find({ report: reports[1]._id });
    const labValues5 = await LabValue.find({ report: reports[4]._id });

    console.log(`Report 1 Lab Values count: ${labValues1.length}`);
    console.log(`Report 2 Lab Values count: ${labValues2.length}`);
    console.log(`Report 5 Lab Values count: ${labValues5.length}`);

    assert.strictEqual(labValues1.length, 2, 'Report 1 must have 2 lab values');
    assert.strictEqual(labValues2.length, 2, 'Report 2 must have 2 lab values');
    assert.strictEqual(labValues5.length, 2, 'Report 5 must have 2 lab values');

    console.log('\n✅ TEST 1 PASSED: All 5 concurrent uploads processed safely without worker termination or race conditions.\n');

    // Clean up test documents
    const validReportIds = [reports[0]._id, reports[1]._id, reports[2]._id, reports[4]._id];
    await LabValue.deleteMany({ report: { $in: validReportIds } });
    await Report.deleteMany({ _id: { $in: validReportIds } });

    console.log('================================================================');
    console.log('🎉 CONCURRENT OCR QUEUE SUITE PASSED SUCCESSFULLY!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ CONCURRENT QUEUE TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runConcurrentOcrQueueTests();
