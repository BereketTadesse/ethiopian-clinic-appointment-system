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

    // The booking ACCOUNT (User _id in user-service). Shared by everyone in the family.
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Patient ID is required']
    },

    // The PERSON this card belongs to: null = the account holder, otherwise the
    // FamilyMember _id from user-service. Every person gets their own card, so a
    // child's history, blood type and allergies are never mixed with the parent's.
    familyMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
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

// One card per PERSON: (account, family member). familyMemberId null = account holder.
// Replaces the old unique index on patientId alone (see config/migrations.js).
patientCardSchema.index({ patientId: 1, familyMemberId: 1 }, { unique: true, name: 'patient_person_unique' });

const PatientCard = mongoose.model('PatientCard', patientCardSchema);
export default PatientCard;