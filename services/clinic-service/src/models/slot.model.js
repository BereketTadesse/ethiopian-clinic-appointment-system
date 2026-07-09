import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'A slot must be assigned to a specific doctor profile']
    },
    date: {
      type: String, // Stored as 'YYYY-MM-DD' (e.g., '2026-06-16') to avoid timezone shifting issues
      required: [true, 'The target calendar date is required']
    },
    startTime: {
      type: String, // 'HH:MM' format (e.g., '08:40')
      required: [true, 'Slot start time is required']
    },
    endTime: {
      type: String, // 'HH:MM' format (e.g., '09:20')
      required: [true, 'Slot end time is required']
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'booked','blocked'],
      default: 'available'
    },
    appointmentId: {
      type: String, // Links to the Appointment Service record once booked
      default: null
    }
  },
  { 
    timestamps: true 
  }
);

// Prevent creating duplicate slots for the same doctor at the same time on the same day
slotSchema.index({ doctorId: 1, date: 1, startTime: 1 }, { unique: true });

const Slot = mongoose.model('Slot', slotSchema);
export default Slot;