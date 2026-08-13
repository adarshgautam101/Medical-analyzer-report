import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['patient', 'doctor'],
    required: true,
  },
  doctorCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DoctorCategory',
    default: null,
  },
  doctorSpecialty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DoctorSpecialty',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.index({ role: 1 });
userSchema.index({ doctorCategory: 1 });
userSchema.index({ doctorSpecialty: 1 });

export const User = mongoose.model('User', userSchema);
