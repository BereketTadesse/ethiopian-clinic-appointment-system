import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: String, // Format: 'YYYY-MM-DD' (e.g. '2026-09-11')
      required: [true, 'Closure date is required (format: YYYY-MM-DD)'],
      unique: true,
      trim: true
    },
    name: {
      type: String, // e.g. "Enkutatash / Ethiopian New Year", "Meskel", "Clinic Maintenance"
      required: [true, 'Holiday / closure reason name is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    isClosed: {
      type: Boolean,
      default: true // When true, completely halts slot generation & marks clinic closed
    },
    createdBy: {
      type: String, // Admin User ID who designated this closure
      default: null
    }
  },
  { 
    timestamps: true 
  }
);

const Holiday = mongoose.model('Holiday', holidaySchema);
export default Holiday;
