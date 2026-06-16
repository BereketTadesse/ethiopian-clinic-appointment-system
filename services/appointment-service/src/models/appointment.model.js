import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model('Appointment', appointmentSchema);
