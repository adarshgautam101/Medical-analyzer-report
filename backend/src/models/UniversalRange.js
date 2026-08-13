import mongoose from 'mongoose';

const universalRangeSchema = new mongoose.Schema({
  parameterName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  referenceRange: {
    type: String,
    required: true,
    trim: true,
  },
  unit: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
});

export const UniversalRange = mongoose.model('UniversalRange', universalRangeSchema);
