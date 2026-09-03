import path from 'path';
import fs from 'fs';
import { Report, LabValue, PatientDoctorAccess } from '../models/index.js';
import { processReportInBackground, extractDocumentText, validateExtractedText, isMedicalDocument, ocrQueue } from '../utils/parser.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

const UPLOAD_DIR = 'uploads';

const checkDoctorAccess = async (patientId, doctorId) => {
  const allowedStatuses = ['approved', 'accepted'];
  const access = await PatientDoctorAccess.findOne({
    patient: patientId,
    doctor: doctorId,
    status: { $in: allowedStatuses },
  });
  return access !== null;
};

export const uploadReport = async (user, file) => {
  if (user.role !== 'patient') {
    throw new ForbiddenError('Only patients can upload reports');
  }

  if (!file) {
    throw new BadRequestError('No file uploaded');
  }

  let extractedText = '';
  let ocrError = null;
  try {
    const ocrRes = await ocrQueue.enqueue(() => extractDocumentText(file.path, file.mimetype));
    const rawText = ocrRes?.rawText || '';
    const validation = validateExtractedText(rawText);
    if (validation.valid) {
      extractedText = validation.cleanedText;
    } else {
      ocrError = validation.reason || 'Invalid file format or corrupted text';
    }
  } catch (err) {
    ocrError = err.message;
    logger.warn(`Pre-upload OCR extraction warning: ${err.message}`);
  }

  const medicalCheck = extractedText
    ? isMedicalDocument(extractedText)
    : { isMedical: false, reason: ocrError || 'Could not extract medical content from document' };

  if (!medicalCheck.isMedical) {
    logger.warn(`Upload rejected for non-medical document: ${file.filename}, reason: ${medicalCheck.reason}`);
    try {
      if (fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }
    } catch (e) {
      logger.warn(`Failed to remove rejected upload file: ${e.message}`);
    }
    throw new BadRequestError(
      'This file is not a valid medical report and cannot be uploaded. Please upload a valid medical report.',
      'INVALID_MEDICAL_REPORT'
    );
  }

  const report = new Report({
    user: user.id,
    fileName: file.filename,
    filePath: file.path,
    fileType: file.mimetype,
    ocrStatus: 'pending',
    extractedText: extractedText || '',
  });

  await report.save();

  processReportInBackground(report._id, report.filePath, file.mimetype);

  logger.info(`Report uploaded: ${report._id} by user ${user.id}`);

  return {
    id: report._id.toString(),
    file_name: report.fileName,
    status: 'uploaded',
    ocr_status: 'processing',
  };
};

export const getReports = async (user) => {
  let reports = [];

  if (user.role === 'doctor') {
    const approvedAccess = await PatientDoctorAccess.find({
      doctor: user.id,
      status: { $in: ['approved', 'accepted'] },
    });
    const patientIds = approvedAccess.map((access) => access.patient);

    reports = await Report.find({ user: { $in: patientIds } })
      .populate('category')
      .sort({ uploadDate: -1 });
  } else {
    reports = await Report.find({ user: user.id })
      .populate('category')
      .sort({ uploadDate: -1 });
  }

  return reports.map((r) => ({
    id: r._id.toString(),
    file_name: r.fileName,
    upload_date: r.uploadDate.toISOString(),
    ocr_status: r.ocrStatus,
    rejection_reason: r.rejectionReason || '',
    ai_summary: r.aiSummary,
    category: r.category ? r.category.name : null,
  }));
};

export const getSummary = async (user) => {
  let patientIds = [];

  if (user.role === 'doctor') {
    const approvedAccess = await PatientDoctorAccess.find({
      doctor: user.id,
      status: { $in: ['approved', 'accepted'] },
    });
    patientIds = approvedAccess.map((access) => access.patient);
  } else {
    patientIds = [user.id];
  }

  const reportQuery = { user: { $in: patientIds } };
  const totalReports = await Report.countDocuments(reportQuery);

  const recentReports = await Report.find(reportQuery)
    .populate('category')
    .sort({ uploadDate: -1 })
    .limit(3);

  const allReports = await Report.find(reportQuery);
  const reportIds = allReports.map((r) => r._id);

  const abnormalCount = await LabValue.countDocuments({
    report: { $in: reportIds },
    isAbnormal: true,
  });

  return {
    total_reports: totalReports,
    abnormal_count: abnormalCount,
    recent_reports: recentReports.map((r) => ({
      id: r._id.toString(),
      file_name: r.fileName,
      upload_date: r.uploadDate.toISOString(),
      ocr_status: r.ocrStatus,
      rejection_reason: r.rejectionReason || '',
      ai_summary: r.aiSummary,
      category: r.category ? r.category.name : null,
    })),
  };
};

export const getReportDetails = async (user, reportId) => {
  const report = await Report.findById(reportId).populate('category');
  if (!report) {
    throw new NotFoundError('Report not found');
  }

  if (user.role === 'patient' && report.user.toString() !== user.id) {
    throw new ForbiddenError('Access denied');
  } else if (user.role === 'doctor') {
    const hasAccess = await checkDoctorAccess(report.user, user.id);
    if (!hasAccess) {
      throw new ForbiddenError('Access denied');
    }
  }

  const labValues = await LabValue.find({ report: report._id });

  logger.info(`[getReportDetails] Report: ${report._id}, ocrStatus: ${report.ocrStatus}, category: ${report.category ? report.category.name : 'Uncategorized'}, lab_values count: ${labValues.length}, parameters: ${labValues.map((lv) => lv.parameterName).join(', ')}`);

  let cleanAiSummary = report.aiSummary || '';
  let cleanAiSummaryData = report.aiSummaryData || null;

  if (typeof cleanAiSummary === 'string' && cleanAiSummary.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(cleanAiSummary.trim());
      if (parsed && typeof parsed === 'object') {
        cleanAiSummary = parsed.summary || '';
        if (!cleanAiSummaryData) {
          cleanAiSummaryData = parsed;
        }
      }
    } catch (e) { }
  }

  if (cleanAiSummaryData && typeof cleanAiSummaryData.summary === 'string' && cleanAiSummaryData.summary.trim().startsWith('{')) {
    try {
      const parsedInner = JSON.parse(cleanAiSummaryData.summary.trim());
      if (parsedInner && typeof parsedInner === 'object' && parsedInner.summary) {
        cleanAiSummary = parsedInner.summary;
        cleanAiSummaryData = { ...cleanAiSummaryData, ...parsedInner, summary: parsedInner.summary };
      }
    } catch (e) { }
  }

  return {
    id: report._id.toString(),
    file_name: report.fileName,
    upload_date: report.uploadDate.toISOString(),
    ocr_status: report.ocrStatus,
    rejection_reason: report.rejectionReason || '',
    ai_summary: cleanAiSummary,
    ai_summary_data: cleanAiSummaryData,
    extracted_text: report.extractedText,
    category: report.category ? report.category.name : null,
    lab_values: labValues.map((lv) => ({
      id: lv._id.toString(),
      parameter_name: lv.parameterName,
      value_type: lv.valueType || 'numeric',
      value: lv.value,
      qualitative_value: lv.qualitativeValue || '',
      unit: lv.unit,
      reference_range: lv.referenceRange,
      is_abnormal: lv.isAbnormal,
      confidence: lv.confidence || 1.0,
      page_number: lv.pageNumber || 1,
      source_text: lv.sourceText || '',
      reference_status: lv.referenceStatus || 'unknown',
    })),
  };
};

export const deleteReport = async (user, reportId) => {
  if (user.role !== 'patient') {
    throw new ForbiddenError('Only patients can delete reports');
  }

  const report = await Report.findById(reportId);
  if (!report) {
    throw new NotFoundError('Report not found');
  }

  if (report.user.toString() !== user.id) {
    throw new ForbiddenError('Access denied');
  }


  if (report.filePath) {
    try {
      await fs.promises.unlink(report.filePath);
    } catch (err) {
      logger.warn(`File deletion failed or file not found at ${report.filePath}: ${err.message}`);
    }
  }

  await LabValue.deleteMany({ report: report._id });
  await Report.findByIdAndDelete(report._id);

  logger.info(`Report ${reportId} deleted by user ${user.id}`);

  return { message: 'Report deleted successfully' };
};


