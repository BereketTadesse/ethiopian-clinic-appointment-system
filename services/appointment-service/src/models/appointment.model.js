import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    cardNumber: {
      type: String,
      required: [true, 'Patient card number link is required'],
      index: true
    },
    patientId: {
      type: String, // Linked User Service patient ID
      required: [true, 'Patient ID is required'],
      index: true
    },
    doctorId: {
      type: String, // Linked Clinic Service doctor profile ID
      required: [true, 'Doctor ID is required'],
      index: true
    },
    slotId: {
      type: String, // Linked Clinic Service 40-minute slot ID
      required: [true, 'Slot ID is required'],
      unique: true // 🎯 Critical Guard: Prevents double-booking the same slot!
    },
    date: {
      type: String, // Format: 'YYYY-MM-DD'
      required: [true, 'Appointment date is required'],
      index: true
    },
    startTime: {
      type: String, // e.g., '08:00'
      required: [true, 'Start time is required']
    },
    endTime: {
      type: String, // e.g., '08:40'
      required: [true, 'End time is required']
    },
    queueNumber: {
      type: Number,
      required: [true, 'Daily queue number positioning is required']
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'], // Keeping it simple [cite: 42]
      default: 'scheduled'
    },
    // Doctor fills these out post-visit
    doctorNotes: {
      type: String,
      default: ''
    },
    prescription: {
      type: String,
      default: ''
    },
    followUpDate: {
      type: String, // 'YYYY-MM-DD' if needed
      default: null
    },
    // Cancellation details
    cancelReason: {
      type: String,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    }
  },
  { 
    timestamps: true 
  }
);

// High-speed compound lookup indexing for queue management
appointmentSchema.index({ doctorId: 1, date: 1, status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;