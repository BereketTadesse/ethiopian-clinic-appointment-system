import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    // ── The patient's card (permanent link) ──────────────────────
    cardNumber: {
      type: String,
      required: [true, 'Patient card number link is required'],
      index: true
      // VARCHAR(30) REFERENCES patient_cards(cardNumber) NOT NULL
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Patient ID is required'],
      index: true
      // INTEGER NOT NULL / Links to User Service
    },

    // ── The doctor and slot (from Clinic Service) ────────────────
    doctorId: {
      type: String, // Linked Clinic Service doctor profile ID
      required: [true, 'Doctor ID is required'],
      index: true
      // INTEGER NOT NULL
    },
    slotId: {
      type: String, // Linked Clinic Service 40-minute slot ID
      required: [true, 'Slot ID is required'],
      unique: true // 🎯 Critical Guard: Prevents double-booking the same slot!
      // INTEGER NOT NULL UNIQUE
    },
    date: {
      type: String, // Format: 'YYYY-MM-DD'
      required: [true, 'Appointment date is required'],
      index: true
      // DATE NOT NULL
    },
    startTime: {
      type: String, // e.g., '08:00'
      required: [true, 'Start time is required']
      // TIME NOT NULL
    },
    endTime: {
      type: String, // e.g., '08:40'
      required: [true, 'End time is required']
      // TIME NOT NULL
    },

    // ── Queue position for this doctor on this day ───────────────
    queueNumber: {
      type: Number,
      required: [true, 'Daily queue number positioning is required']
      // INTEGER NOT NULL
    },

    // ── Status of the appointment ────────────────────────────────
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'], // Keeping it simple
      default: 'scheduled'
      // VARCHAR(20) DEFAULT 'scheduled'
    },

    // ── Doctor fills these after the visit (optional) ────────────
    doctorNotes: {
      type: String,
      default: ''
      // TEXT
    },
    prescription: {
      type: String,
      default: ''
      // TEXT
    },
    followUpDate: {
      type: String, // 'YYYY-MM-DD' if needed
      default: null
      // DATE
    },

    // ── If cancelled ─────────────────────────────────────────────
    cancelReason: {
      type: String,
      default: null
      // TEXT
    },
    cancelledAt: {
      type: Date,
      default: null
      // TIMESTAMP
    }
  },
  { 
    timestamps: true 
    // Adds createdAt and updatedAt automatically (TIMESTAMP DEFAULT NOW())
  }
);

// High-speed compound lookup indexing for queue management
appointmentSchema.index({ doctorId: 1, date: 1, status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;