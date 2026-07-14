// models/FamilyMember.model.js

const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema(
  {
    // ── Who manages this profile ──────────────────────────
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true        // fast lookup of all members under one account
    },

    // Is this the account holder's own profile?
    isSelf: {
      type: Boolean,
      default: false
      // One document per user will have isSelf: true
      // Created automatically when user registers
    },

    // ── Personal Info ─────────────────────────────────────
    fullName: {
      type: String,
      required: true,
      trim: true         // "  Dawit  " → "Dawit"
    },

    dateOfBirth: {
      type: Date,
      required: true     // needed to know if child, adult, elderly
    },

    gender: {
      type: String,
      required: true,
      enum: ['male', 'female']
    },

    relationship: {
      type: String,
      required: true,
      enum: [
        'self',          // the account holder themselves
        'wife',
        'husband',
        'son',
        'daughter',
        'mother',
        'father',
        'sister',
        'brother',
        'grandfather',
        'grandmother',
        'other'
      ]
    },

    // ── Contact (optional — if member has their own phone) ─
    phoneNumber: {
      type: String,
      default: null      // if null, use account holder's phone for SMS
      // format: +251XXXXXXXXX
    },

    // ── Identity (optional) ───────────────────────────────
    nationalId: {
      type: String,
      default: null      // Ethiopian national ID if available
    },

    // ── Status ────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true
      // soft delete: set false instead of removing
    }
  },
  {
    timestamps: true     // adds createdAt and updatedAt automatically
  }
);

// ── Indexes ───────────────────────────────────────────────

// Fast lookup: get all family members of one account
familyMemberSchema.index({ accountId: 1 });

// Ensure only ONE isSelf: true per account
familyMemberSchema.index(
  { accountId: 1, isSelf: 1 },
  { unique: true, partialFilterExpression: { isSelf: true } }
  // This unique index only applies when isSelf is true
  // so one account can have many members but only one "self"
);

const FamilyMember = mongoose.model('FamilyMember', familyMemberSchema);
module.exports = FamilyMember;