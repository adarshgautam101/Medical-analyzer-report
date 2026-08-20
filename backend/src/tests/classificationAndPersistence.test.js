import assert from 'assert';
import mongoose from 'mongoose';
import { processReportInBackground, isMedicalDocument, verifyFileHeader } from '../utils/parser.js';
import { Report, LabValue, User } from '../models/index.js';
import { getReportDetails } from '../services/reportsService.js';
import { env } from '../config/env.js';

async function runClassificationAndPersistenceTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING DOCUMENT CLASSIFICATION & PERSISTENCE REGRESSION TEST');
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

    // TEST 1: 3-Parameter Medical Report (Hemoglobin, WBC, Glucose)
    console.log('--- TEST 1: 3-Parameter Valid Medical Report ---');
    const medicalText = `
      PATIENT LABORATORY REPORT
      Patient Name: John Doe    Date: 2026-08-20

      INVESTIGATION            RESULT      UNITS      REFERENCE RANGE
      Haemoglobin              10.2        g/dL       12.0 - 16.0
      WBC                      12500       10^3/uL    4.0 - 11.0
      Glucose                  180         mg/dL      70 - 99
    `;

    const medCheck = isMedicalDocument(medicalText);
    console.log(`Classification Result: isMedical = ${medCheck.isMedical}, Reason = "${medCheck.reason}"`);
    assert.strictEqual(medCheck.isMedical, true, 'Medical report must be classified as medical');

    const medReport = new Report({
      user: user._id,
      fileName: 'medical_report_3_params.pdf',
      filePath: 'uploads/mock_medical_3.pdf',
      fileType: 'application/pdf',
      ocrStatus: 'processing',
      extractedText: medicalText
    });
    await medReport.save();

    await processReportInBackground(medReport._id, null, 'application/pdf');

    const updatedMedReport = await Report.findById(medReport._id);
    const dbLabValues = await LabValue.find({ report: medReport._id });
    const apiDetails = await getReportDetails({ _id: user._id, id: user._id.toString(), role: 'patient' }, medReport._id.toString());

    console.log(`Updated Report ocrStatus: ${updatedMedReport.ocrStatus}`);
    console.log(`MongoDB LabValue Count: ${dbLabValues.length}`);
    console.log(`API lab_values Count: ${apiDetails.lab_values.length}`);
    console.log(`Extracted Parameters: ${dbLabValues.map(lv => lv.parameterName).join(', ')}`);

    assert.strictEqual(updatedMedReport.ocrStatus, 'completed', 'Medical report ocrStatus must be completed');
    assert.strictEqual(dbLabValues.length, 3, 'MongoDB must contain exactly 3 LabValue documents');
    assert.strictEqual(apiDetails.lab_values.length, 3, 'API response must contain exactly 3 lab_values');

    const paramNames = dbLabValues.map(lv => lv.parameterName);
    assert.ok(paramNames.includes('Haemoglobin'), 'Haemoglobin must be persisted');
    assert.ok(paramNames.includes('WBC'), 'WBC must be persisted');
    assert.ok(paramNames.includes('Glucose'), 'Glucose must be persisted');

    console.log('✅ TEST 1 PASSED: 3-parameter medical report processed and persisted successfully.\n');

    // TEST 2: Unstructured Medical Report (Scatter & Qualitative)
    console.log('--- TEST 2: Unstructured / Qualitative Medical Report ---');
    const qualitativeText = `
      PATHOLOGY LABORATORY RESULTS
      Patient: Jane Smith

      HIV 1&2 Antibody: Negative
      HBsAg: Negative
      COVID-19 RT-PCR: Not Detected
    `;

    const qualCheck = isMedicalDocument(qualitativeText);
    console.log(`Classification Result: isMedical = ${qualCheck.isMedical}`);
    assert.strictEqual(qualCheck.isMedical, true, 'Qualitative report must be classified as medical');

    const qualReport = new Report({
      user: user._id,
      fileName: 'qualitative_report.pdf',
      filePath: 'uploads/mock_qual.pdf',
      fileType: 'application/pdf',
      ocrStatus: 'processing',
      extractedText: qualitativeText
    });
    await qualReport.save();

    await processReportInBackground(qualReport._id, null, 'application/pdf');

    const updatedQualReport = await Report.findById(qualReport._id);
    const dbQualValues = await LabValue.find({ report: qualReport._id });

    console.log(`Updated Report ocrStatus: ${updatedQualReport.ocrStatus}`);
    console.log(`MongoDB LabValue Count: ${dbQualValues.length}`);

    assert.strictEqual(updatedQualReport.ocrStatus, 'completed', 'Qualitative medical report must be completed');
    assert.ok(dbQualValues.length >= 1, 'Qualitative medical parameters should be persisted');
    console.log('✅ TEST 2 PASSED: Qualitative medical report accepted.\n');

    // TEST 3: Non-Medical Invoice Rejection
    console.log('--- TEST 3: Non-Medical Document Rejection (Invoice) ---');
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
      ocrStatus: 'processing',
      extractedText: invoiceText
    });
    await invoiceReport.save();

    await processReportInBackground(invoiceReport._id, null, 'application/pdf');

    const updatedInvoiceReport = await Report.findById(invoiceReport._id);
    const dbInvoiceLabValues = await LabValue.find({ report: invoiceReport._id });

    console.log(`Updated Invoice ocrStatus: ${updatedInvoiceReport.ocrStatus}`);
    console.log(`Rejection Reason: "${updatedInvoiceReport.rejectionReason}"`);
    console.log(`MongoDB LabValue Count: ${dbInvoiceLabValues.length}`);
    console.log(`AI Summary Saved: "${updatedInvoiceReport.aiSummary}"`);

    assert.strictEqual(updatedInvoiceReport.ocrStatus, 'invalid', 'Invoice report ocrStatus must be invalid');
    assert.ok(updatedInvoiceReport.rejectionReason.length > 0, 'Rejection reason must be populated');
    assert.strictEqual(dbInvoiceLabValues.length, 0, 'No LabValue documents must be created for invoice');
    assert.strictEqual(updatedInvoiceReport.aiSummary, '', 'No medical AI summary should be generated for invoice');

    console.log('✅ TEST 3 PASSED: Non-medical invoice rejected without AI call or LabValue persistence.\n');

    // TEST 4: Non-Medical Resume Rejection
    console.log('--- TEST 4: Non-Medical Document Rejection (Resume) ---');
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
      ocrStatus: 'processing',
      extractedText: resumeText
    });
    await resumeReport.save();

    await processReportInBackground(resumeReport._id, null, 'application/pdf');

    const updatedResumeReport = await Report.findById(resumeReport._id);
    const dbResumeLabValues = await LabValue.find({ report: resumeReport._id });

    assert.strictEqual(updatedResumeReport.ocrStatus, 'invalid', 'Resume ocrStatus must be invalid');
    assert.strictEqual(dbResumeLabValues.length, 0, 'No LabValue documents for resume');
    console.log('✅ TEST 4 PASSED: Resume rejected cleanly.\n');

    // Clean up test reports
    await LabValue.deleteMany({ report: { $in: [medReport._id, qualReport._id, invoiceReport._id, resumeReport._id] } });
    await Report.deleteMany({ _id: { $in: [medReport._id, qualReport._id, invoiceReport._id, resumeReport._id] } });

    console.log('================================================================');
    console.log('🎉 ALL CLASSIFICATION & PERSISTENCE TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ REGRESSION TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runClassificationAndPersistenceTests();
