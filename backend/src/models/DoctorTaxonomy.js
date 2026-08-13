import mongoose from 'mongoose';


const doctorCategorySchema = new mongoose.Schema({
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
});

export const DoctorCategory = mongoose.model('DoctorCategory', doctorCategorySchema);


const doctorSpecialtySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: null,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DoctorCategory',
    required: true,
  },
});


doctorSpecialtySchema.index({ category: 1, name: 1 }, { unique: true });

export const DoctorSpecialty = mongoose.model('DoctorSpecialty', doctorSpecialtySchema);
