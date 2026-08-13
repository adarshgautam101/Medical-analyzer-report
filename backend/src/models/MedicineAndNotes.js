import mongoose from 'mongoose';


const medicineSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  dosage: {
    type: String,
    required: true,
    trim: true,
  },
  frequency: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['current', 'past'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

medicineSchema.index({ user: 1 });

export const Medicine = mongoose.model('Medicine', medicineSchema);


const doctorNoteSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  report: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    default: null,
  },
  noteText: {
    type: String,
    required: true,
  },
  noteType: {
    type: String,
    enum: ['consultation', 'examination', 'followup'],
    default: 'consultation',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

doctorNoteSchema.index({ patient: 1 });
doctorNoteSchema.index({ doctor: 1 });
doctorNoteSchema.index({ report: 1 });

export const DoctorNote = mongoose.model('DoctorNote', doctorNoteSchema);
