import mongoose from 'mongoose';


const doctorProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  degrees: {
    type: String, 
    default: '',
  },
  specialization: {
    type: String,
    default: '',
  },
  experienceYears: {
    type: Number,
    default: null,
  },
  licenseNumber: {
    type: String,
    default: '',
  },
  licenseIssuingAuthority: {
    type: String,
    default: '',
  },
  clinicName: {
    type: String,
    default: '',
  },
  clinicAddress: {
    type: String,
    default: '',
  },
  clinicPhone: {
    type: String,
    default: '',
  },
  clinicEmail: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
  },
  visibleFields: {
    type: Map,
    of: Boolean,
    default: {
      degrees: true,
      specialization: true,
      experienceYears: true,
      licenseNumber: false,
      licenseIssuingAuthority: false,
      clinicName: true,
      clinicAddress: true,
      clinicPhone: false,
      clinicEmail: false,
      bio: true,
    },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);


const patientProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  age: {
    type: Number,
    default: null,
  },
  gender: {
    type: String, 
    default: '',
  },
  heightCm: {
    type: Number,
    default: null,
  },
  weightKg: {
    type: Number,
    default: null,
  },
  bmi: {
    type: Number,
    default: null,
  },
  bloodGroup: {
    type: String, 
    default: '',
  },
  allergies: {
    type: String, 
    default: '',
  },
  chronicConditions: {
    type: String, 
    default: '',
  },
  lifestyleIndicators: {
    type: String, 
    default: '',
  },
  emergencyContactName: {
    type: String,
    default: '',
  },
  emergencyContactPhone: {
    type: String,
    default: '',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const PatientProfile = mongoose.model('PatientProfile', patientProfileSchema);
