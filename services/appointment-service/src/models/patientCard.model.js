import mongoose from 'mongoose';

const patientCardSchema = new mongoose.Schema(
  {
    cardNumber: {
      type: String,
      required: [true, 'Card number is required'],
      unique: true, // Format: CLN-2026-00001
      index: true
    },
    patientId: {
      type: String, // Links directly to the _id string from your User Service
      required: [true, 'Patient ID link from User Service is required'],
      unique: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { 
    timestamps: true 
  }
);

const PatientCard = mongoose.model('PatientCard', patientCardSchema);
export default PatientCard;