import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    _id: {
      type: String, // Stores the unique User ID string from User Service as the primary key
      required: [true, 'User ID link from User Service is required']
    },
    specialization: {
      type: String,
      required: [true, 'Medical specialization department is required'], // e.g., 'General Practitioner', 'Pediatrics', 'Dental'
      trim: true
    },
    licenseNumber: {
      type: String,
      required: [true, 'Medical practice license number is required'],
      unique: true,
      trim: true
    },
    yearsOfExperience: {
      type: Number,
      default: 0
    },
    bio: {
      type: String,
      default: ''
    },
    
    // 🕒 Shift Availability (Assigned by Admin, used by your Slot Algorithm)
    availableDays: {
      type: [String], // e.g., ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      required: [true, 'Doctor weekly working days are required']
    },
    startTime: {
      type: String, // Stored as 'HH:MM' (24hr), e.g., '08:30'
      required: [true, 'Shift start time is required']
    },
    endTime: {
      type: String, // Stored as 'HH:MM' (24hr), e.g., '17:30'
      required: [true, 'Shift end time is required']
    },
    breakStart: {
      type: String, // Lunch break start, e.g., '12:30'
      default: null
    },
    breakEnd: {
      type: String, // Lunch break end, e.g., '13:30'
      default: null
    },

    // 🚦 System Toggles
    isAcceptingPatients: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true // Set to false for a soft-delete to keep historical cards intact
    }
  },
  { 
    timestamps: true 
  }
);

// ============================================================
// 🪝 MONGOOSE CASCADE HOOKS
// ============================================================

/**
 * PRE-SAVE HOOK — Detect deactivation before the write hits the DB.
 *
 * `this.isModified()` is only available in pre-hooks, so we snapshot
 * the deactivation intent here and carry it as a temporary instance
 * flag (_wasDeactivated) for the post-save hook to consume.
 */
doctorSchema.pre('save', function () {
  // Flag is true only when isActive is being explicitly changed TO false
  this._wasDeactivated = this.isModified('isActive') && this.isActive === false;
});

/**
 * POST-SAVE HOOK — Cascade slot cancellation after the Doctor doc is persisted.
 *
 * We use mongoose.model('Slot') instead of a top-level import to avoid a
 * circular dependency (both models live in the same service and are fully
 * registered before any hook fires at runtime).
 *
 * Only cancels slots with status 'available' or 'reserved' — already
 * 'booked' slots are left for the appointment-service to handle separately.
 */
doctorSchema.post('save', async function (doc) {
  if (!doc._wasDeactivated) return; // Nothing to do if isActive wasn't changed to false

  try {
    const Slot = mongoose.model('Slot');

    const result = await Slot.updateMany(
      {
        doctorId: doc._id,
        status: { $in: ['available', 'reserved'] }
      },
      { $set: { status: 'cancelled' } }
    );

    console.log(
      `🔄 Cascade: ${result.modifiedCount} slot(s) cancelled for deactivated doctor ${doc._id}`
    );
  } catch (err) {
    // Log but do NOT throw — the Doctor save already succeeded.
    // Orphaned slots can be cleaned up by a scheduled admin cron job.
    console.error(
      `⚠️ Slot cascade failed for doctor ${doc._id}: ${err.message}`
    );
  }
});

const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;