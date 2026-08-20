import mongoose from 'mongoose';


const reportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  reportDate: {
    type: Date,
    default: null,
  },
  ocrStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'invalid'],
    default: 'pending',
  },
  rejectionReason: {
    type: String,
    default: '',
  },
  extractedText: {
    type: String,
    default: '',
  },
  aiSummary: {
    type: String,
    default: '',
  },
  aiSummaryData: {
    type: Object,
    default: null,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReportCategory',
    default: null,
  },
});

reportSchema.index({ user: 1 });
reportSchema.index({ uploadDate: -1 });
reportSchema.index({ category: 1 });
reportSchema.index({ ocrStatus: 1 });

export const Report = mongoose.model('Report', reportSchema);


const labValueSchema = new mongoose.Schema({
  report: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: true,
  },
  parameterName: {
    type: String,
    required: true,
    trim: true,
  },
  valueType: {
    type: String,
    enum: ['numeric', 'qualitative'],
    default: 'numeric',
  },
  value: {
    type: Number,
    default: null,
  },
  qualitativeValue: {
    type: String,
    trim: true,
    default: '',
  },
  unit: {
    type: String,
    trim: true,
    default: '',
  },
  referenceRange: {
    type: String,
    trim: true,
    default: '',
  },
  isAbnormal: {
    type: Boolean,
    default: false,
  },
  sourceText: {
    type: String,
    trim: true,
    default: '',
  },
  confidence: {
    type: Number,
    default: 1.0,
  },
  pageNumber: {
    type: Number,
    default: 1,
  },
  referenceStatus: {
    type: String,
    enum: ['within', 'outside', 'unknown'],
    default: 'unknown',
  },
  evidenceSource: {
    type: String,
    enum: ['same OCR line', 'adjacent OCR line', 'multi-line reconstruction', 'deterministic OCR normalization'],
    default: 'same OCR line',
  },
});

labValueSchema.index({ report: 1 });
labValueSchema.index({ parameterName: 1 });
labValueSchema.index({ isAbnormal: 1 });
labValueSchema.index({ report: 1, parameterName: 1 });
labValueSchema.index({ report: 1, isAbnormal: 1 });

export const LabValue = mongoose.model('LabValue', labValueSchema);
