import mongoose from 'mongoose';


const patientDoctorAccessSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'accepted', 'rejected', 'revoked'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  grantedAt: {
    type: Date,
    default: null,
  },
  revokedAt: {
    type: Date,
    default: null,
  },
});


patientDoctorAccessSchema.index({ patient: 1, doctor: 1 }, { unique: true });
patientDoctorAccessSchema.index({ doctor: 1, status: 1 });
patientDoctorAccessSchema.index({ patient: 1, status: 1 });

export const PatientDoctorAccess = mongoose.model('PatientDoctorAccess', patientDoctorAccessSchema);


const reportCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const ReportCategory = mongoose.model('ReportCategory', reportCategorySchema);
