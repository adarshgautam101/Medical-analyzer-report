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
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  extractedText: {
    type: String,
    default: '',
  },
  aiSummary: {
    type: String,
    default: '',
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
  value: {
    type: Number,
    required: true,
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
});

labValueSchema.index({ report: 1 });
labValueSchema.index({ parameterName: 1 });
labValueSchema.index({ isAbnormal: 1 });
labValueSchema.index({ report: 1, parameterName: 1 });
labValueSchema.index({ report: 1, isAbnormal: 1 });

export const LabValue = mongoose.model('LabValue', labValueSchema);
