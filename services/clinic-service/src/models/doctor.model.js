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

const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;