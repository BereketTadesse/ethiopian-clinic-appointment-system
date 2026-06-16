import mongoose from 'mongoose';

const clinicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Clinic name is required'],
      trim: true,
      default: 'Selam General Clinic'
    },
    description: {
      type: String,
      trim: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Main reception phone number is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    website: {
      type: String,
      trim: true
    },

    // 📍 Location Data Nested Schema
    location: {
      city: {
        type: String,
        required: [true, 'City location is required'],
        default: 'Addis Ababa'
      },
      subCity: {
        type: String, // e.g., 'Bole'
        trim: true
      },
      woreda: {
        type: String, // e.g., 'Woreda 03'
        trim: true
      },
      fullAddress: {
        type: String,
        trim: true
      },
      coordinates: {
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 }
      }
    },

    // 🕒 Working Hours Framework
    workingHours: {
      openDays: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday','saturday','sunday']
      },
      openTime: {
        type: String, // Stored as 'HH:MM' format, e.g., '08:00'
        required: [true, 'Opening hours boundary is required']
      },
      closeTime: {
        type: String, // Stored as 'HH:MM' format, e.g., '17:00'
        required: [true, 'Closing hours boundary is required']
      }
    },

    // 🩺 Departments / Services Offered
    services: {
      type: [String],
      default: ['General Checkup', 'Dental', 'Lab']
    },

    // 🖼️ Media Management Asset Links
    media: {
      logo: {
        type: String, // Cloudinary Asset Storage URL
        default: ''
      },
      coverImage: {
        type: String, // Cloudinary Asset Storage URL
        default: ''
      }
    }
  },
  { 
    timestamps: true // Automatically creates 'createdAt' and 'updatedAt' fields matching image_27c284.png
  }
);

const Clinic = mongoose.model('Clinic', clinicSchema);
export default Clinic;