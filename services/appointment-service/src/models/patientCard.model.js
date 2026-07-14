// models/PatientCard.model.js

import mongoose from 'mongoose';

const patientCardSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────
    cardNumber: {
      type: String,
      required: [true, 'Card number is required'],
      unique: true,       // Format: CLN-2026-00001
      index: true
    },

    // Links to the _id from User Service (the account holder or family member)
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Patient ID is required'],
      unique: true,
      index: true
      // References the User or FamilyMember _id from the User Service
    },

    // ── Basic Medical Background ───────────────────────────────
    // Patient fills this in their profile; helps doctors

    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
      default: null       // e.g. 'A+' | 'B-' | 'O+' | 'AB+'
    },

    allergies: {
      type: [String],
      default: []         // e.g. ['Penicillin', 'Dust']
    },

    chronicConditions: {
      type: [String],
      default: []         // e.g. ['Diabetes', 'Hypertension']
    },

    currentMedications: {
      type: [String],
      default: []         // e.g. ['Metformin 500mg']
    },

    // ── Emergency Contact ──────────────────────────────────────
    emergencyContactName: {
      type: String,
      default: null       // e.g. 'Abebe Kebede'
    },

    emergencyContactPhone: {
      type: String,
      default: null       // e.g. '+251911234567'
      // format: +251XXXXXXXXX
    },

    emergencyContactRelationship: {
      type: String,
      default: null       // e.g. 'brother' | 'wife' | 'parent'
    },

    // ── Status ────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true
      // soft delete: set false instead of removing
    }
  },
  {
    timestamps: true      // adds createdAt and updatedAt automatically
  }
);

// ── Indexes ───────────────────────────────────────────────────

// Fast lookup by patientId
patientCardSchema.index({ patientId: 1 });

// Fast lookup by cardNumber
patientCardSchema.index({ cardNumber: 1 });

const PatientCard = mongoose.model('PatientCard', patientCardSchema);
export default PatientCard;