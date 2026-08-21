import assert from 'assert';
import mongoose from 'mongoose';
import { processReportInBackground, isMedicalDocument } from '../utils/parser.js';
import { Report, LabValue, User } from '../models/index.js';
import { getReportDetails, getReports } from '../services/reportsService.js';
import { env } from '../config/env.js';

async function runClassificationAndPersistenceTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING DOCUMENT CLASSIFICATION & NON-MEDICAL CLEANUP REGRESSION SUITE');
  console.log('================================================================\n');

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log(' Connected to MongoDB');

    let user = await User.findOne({ email: 'test_patient_classifier@example.com' });
    if (!user) {
      user = new User({
        fullName: 'Test Patient Classifier',
        email: 'test_patient_classifier@example.com',
        passwordHash: 'hashed_password_123',
        role: 'patient'
      });
      await user.save();
    }

    const mockUserCtx = { _id: user._id, id: user._id.toString(), role: 'patient' };

    // TEST 1: Non-Medical Document Rejection & Total Cleanup (Resume)
    console.log('--- TEST 1: Non-Medical Resume Rejection & Complete Cleanup ---');
    const resumeText = `
      CURRICULUM VITAE
      John Smith
      Software Engineer

      EDUCATION:
      Bachelor of Science in Computer Science, University of Technology

      EXPERIENCE:
      Senior Software Developer - Tech Corp (2020 - Present)
      - Led backend architecture development
      - Implemented database optimization strategies

      SKILLS:
      JavaScript, Node.js, Python, MongoDB, SQL
    `;

    const resumeCheck = isMedicalDocument(resumeText);
    console.log(`Classification Result: isMedical = ${resumeCheck.isMedical}, Reason = "${resumeCheck.reason}"`);
    assert.strictEqual(resumeCheck.isMedical, false, 'Resume must be classified as non-medical');

    const resumeReport = new Report({
      user: user._id,
      fileName: 'resume.pdf',
      filePath: 'uploads/mock_resume.pdf',
      fileType: 'application/pdf',
      ocrStatus: 'pending',
      extractedText: resumeText
    });
    await resumeReport.save();

    await processReportInBackground(resumeReport._id, null, 'application/pdf');

    const deletedResumeReport = await Report.findById(resumeReport._id);
    const dbResumeLabValues = await LabValue.find({ report: resumeReport._id });
    const userReportsList = await getReports(mockUserCtx);
    const hasResumeInList = userReportsList.some(r => r.id === resumeReport._id.toString());

    console.log(`Report in MongoDB after cleanup: ${deletedResumeReport ? 'EXISTS (FAILED)' : 'NULL (DELETED CLEANLY)'}`);
    console.log(`MongoDB LabValue Count: ${dbResumeLabValues.length}`);
    console.log(`Present in User Reports API list: ${hasResumeInList}`);

    assert.strictEqual(deletedResumeReport, null, 'Non-medical resume report must be completely deleted from MongoDB');
    assert.strictEqual(dbResumeLabValues.length, 0, 'No LabValue documents should exist for non-medical resume');
    assert.strictEqual(hasResumeInList, false, 'Deleted resume report must not appear in user reports listing');

    let getDetailsError = null;
    try {
      await getReportDetails(mockUserCtx, resumeReport._id.toString());
    } catch (err) {
      getDetailsError = err;
    }
    assert.ok(getDetailsError, 'GET /api/reports/:id must fail for deleted resume report');
    assert.strictEqual(getDetailsError.statusCode, 404, 'GET /api/reports/:id must return 404 Not Found');

    console.log('✅ TEST 1 PASSED: Non-medical resume rejected, deleted from DB, omitted from API/UI.\n');

    // TEST 2: Non-Medical Invoice Rejection & Total Cleanup
    console.log('--- TEST 2: Non-Medical Invoice Rejection & Complete Cleanup ---');
    const invoiceText = `
      INVOICE # 98432
      Bill To: ACME Corporation
      Date: 2026-08-01

      Description            Quantity    Price      Subtotal
      Web Development Services 10        $150.00    $1,500.00
      Cloud Server Hosting    1         $250.00    $250.00

      Subtotal: $1,750.00
      Tax (10%): $175.00
      Total Amount: $1,925.00
      Payment Method: Credit Card
    `;

    const invoiceCheck = isMedicalDocument(invoiceText);
    console.log(`Classification Result: isMedical = ${invoiceCheck.isMedical}, Reason = "${invoiceCheck.reason}"`);
    assert.strictEqual(invoiceCheck.isMedical, false, 'Invoice must be classified as non-medical');

    const invoiceReport = new Report({
      user: user._id,
      fileName: 'invoice.pdf',
      filePath: 'uploads/mock_invoice.pdf',
      fileType: 'application/pdf',
      ocrStatus: 'pending',
      extractedText: invoiceText
    });
    await invoiceReport.save();

    await processReportInBackground(invoiceReport._id, null, 'application/pdf');

    const deletedInvoiceReport = await Report.findById(invoiceReport._id);
    const dbInvoiceLabValues = await LabValue.find({ report: invoiceReport._id });
    const userReportsListInvoice = await getReports(mockUserCtx);
    const hasInvoiceInList = userReportsListInvoice.some(r => r.id === invoiceReport._id.toString());

    assert.strictEqual(deletedInvoiceReport, null, 'Non-medical invoice report must be completely deleted from MongoDB');
    assert.strictEqual(dbInvoiceLabValues.length, 0, 'No LabValue documents should exist for non-medical invoice');
    assert.strictEqual(hasInvoiceInList, false, 'Deleted invoice report must not appear in user reports listing');

    console.log('✅ TEST 2 PASSED: Non-medical invoice rejected, deleted from DB, omitted from API/UI.\n');

    // TEST 3: 3-Parameter Valid Medical Report (Preserved)
    console.log('--- TEST 3: Valid Medical Report (3 Parameters Preserved) ---');
    const medicalText = `
      PATIENT LABORATORY REPORT
      Patient Name: John Doe    Date: 2026-08-20

      INVESTIGATION            RESULT      UNITS      REFERENCE RANGE
      Haemoglobin              10.2        g/dL       12.0 - 16.0
      WBC                      12500       10^3/uL    4.0 - 11.0
      Glucose                  180         mg/dL      70 - 99
    `;

    const medCheck = isMedicalDocument(medicalText);
    assert.strictEqual(medCheck.isMedical, true, 'Medical report must be classified as medical');

    const medReport = new Report({
      user: user._id,
      fileName: 'medical_report_3_params.pdf',
      filePath: 'uploads/mock_medical_3.pdf',
      fileType: 'application/pdf',
      ocrStatus: 'pending',
      extractedText: medicalText
    });
    await medReport.save();

    await processReportInBackground(medReport._id, null, 'application/pdf');

    const updatedMedReport = await Report.findById(medReport._id);
    const dbLabValues = await LabValue.find({ report: medReport._id });
    const apiDetails = await getReportDetails(mockUserCtx, medReport._id.toString());

    console.log(`Updated Report ocrStatus: ${updatedMedReport.ocrStatus}`);
    console.log(`MongoDB LabValue Count: ${dbLabValues.length}`);
    console.log(`API lab_values Count: ${apiDetails.lab_values.length}`);

    assert.ok(updatedMedReport, 'Valid medical report must remain in MongoDB');
    assert.strictEqual(updatedMedReport.ocrStatus, 'completed', 'Medical report ocrStatus must be completed');
    assert.strictEqual(dbLabValues.length, 3, 'MongoDB must contain exactly 3 LabValue documents');
    assert.strictEqual(apiDetails.lab_values.length, 3, 'API response must contain exactly 3 lab_values');

    console.log('✅ TEST 3 PASSED: Valid 3-parameter medical report preserved with exact parameter persistence.\n');

    // TEST 4: Medical Report with Zero LabValues (MRI / Unstructured Medical)
    console.log('--- TEST 4: Valid Medical Report with Zero LabValues (MRI / Radiology) ---');
    const mriText = `
      BRAIN MRI EXAMINATION REPORT
      Patient Name: Alice Smith    Date: 2026-08-20
      Clinical History: Headaches and dizziness.

      FINDINGS:
      Multiplanar T1, T2, and FLAIR sequences of the brain were obtained.
      The brain parenchyma demonstrates normal signal intensity throughout.
      No mass effect, midline shift, or acute ischemia is identified.
      Ventricles and sulci are within normal limits for age.

      IMPRESSION:
      Normal brain MRI examination.
    `;

    const mriCheck = isMedicalDocument(mriText);
    console.log(`Classification Result: isMedical = ${mriCheck.isMedical}`);
    assert.strictEqual(mriCheck.isMedical, true, 'MRI report must be classified as medical');

    const mriReport = new Report({
      user: user._id,
      fileName: 'brain_mri.pdf',
      filePath: 'uploads/mock_mri.pdf',
      fileType: 'application/pdf',
      ocrStatus: 'pending',
      extractedText: mriText
    });
    await mriReport.save();

    await processReportInBackground(mriReport._id, null, 'application/pdf');

    const updatedMriReport = await Report.findById(mriReport._id);
    const dbMriLabValues = await LabValue.find({ report: mriReport._id });

    assert.ok(updatedMriReport, 'Valid MRI report must remain in MongoDB even with 0 lab values');
    assert.strictEqual(updatedMriReport.ocrStatus, 'completed', 'MRI report ocrStatus must be completed');
    assert.strictEqual(dbMriLabValues.length, 0, 'Zero LabValue documents expected for narrative MRI');

    console.log('✅ TEST 4 PASSED: Medical report with zero lab values preserved with ocrStatus = completed.\n');

    // TEST 5: Technical Failure Preservation (Header / OCR Error)
    console.log('--- TEST 5: Technical Failure Preservation (Header Error) ---');
    const corruptReport = new Report({
      user: user._id,
      fileName: 'corrupt_file.pdf',
      filePath: 'uploads/non_existent_corrupt.pdf',
      fileType: 'application/pdf',
      ocrStatus: 'pending'
    });
    await corruptReport.save();

    await processReportInBackground(corruptReport._id, 'uploads/non_existent_corrupt.pdf', 'application/pdf');

    const updatedCorruptReport = await Report.findById(corruptReport._id);
    assert.ok(updatedCorruptReport, 'Technical failure report must NOT be deleted as non-medical');
    assert.strictEqual(updatedCorruptReport.ocrStatus, 'failed', 'Corrupt file ocrStatus must be failed');

    console.log('✅ TEST 5 PASSED: Technical failure preserved with ocrStatus = failed.\n');

    // Clean up test reports
    await LabValue.deleteMany({ report: { $in: [medReport._id, mriReport._id, corruptReport._id] } });
    await Report.deleteMany({ _id: { $in: [medReport._id, mriReport._id, corruptReport._id] } });

    console.log('================================================================');
    console.log('🎉 ALL CLASSIFICATION & NON-MEDICAL CLEANUP TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ REGRESSION TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runClassificationAndPersistenceTests();
