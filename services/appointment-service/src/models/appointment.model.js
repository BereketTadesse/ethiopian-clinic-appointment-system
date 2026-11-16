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
    // Who the visit is for: null = the account holder, otherwise the FamilyMember _id
    familyMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    patientName: {
      type: String,
      default: ''
    },
    forPerson: {
      type: String,
      default: 'Self'
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
      required: [true, 'Slot ID is required']
      // Uniqueness is enforced by the partial index below: only ACTIVE appointments hold a slot,
      // so a cancelled appointment frees its slot for a new booking.
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

    // Why the patient is coming (sent at booking; was previously dropped because the field was missing)
    reasonForVisit: {
      type: String,
      default: '',
      maxlength: 1000
    },

    // ── Queue position (legacy) ──────────────────────────────────
    // No longer written. The queue number is computed when read: the appointment's position
    // in the doctor's day ordered by slot start time (see services/queue.service.js).
    // Kept only so old documents stay valid.
    queueNumber: {
      type: Number,
      default: null
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
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'staff', 'system', null],
      default: null
    }
  },
  { 
    timestamps: true 
    // Adds createdAt and updatedAt automatically (TIMESTAMP DEFAULT NOW())
  }
);

// High-speed compound lookup indexing for queue management
appointmentSchema.index({ doctorId: 1, date: 1, status: 1 });

// 🎯 Double-booking guard: at most one ACTIVE appointment per slot. Cancelled ones don't count.
// (Replaces the old plain unique index `slotId_1`; see config/migrations.js.)
export const ACTIVE_STATUSES = ['scheduled', 'completed'];
appointmentSchema.index(
  { slotId: 1 },
  {
    name: 'slotId_active_unique',
    unique: true,
    partialFilterExpression: { status: { $in: ACTIVE_STATUSES } }
  }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;