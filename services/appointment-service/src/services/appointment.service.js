import Appointment from '../models/appointment.model.js';
import PatientCard from '../models/patientCard.model.js';
import { generateCardNumber } from './card.service.js';
import { clinicClient } from './clinicClient.service.js';

/**
 * Core Orchestrator: Processes the complete step-by-step clinic booking sequence
 */
export const createNewAppointment = async (bookingData, patientId, incomingToken) => {
  const { doctorId, slotId, date } = bookingData;

  // Step 1: Prevent duplicate bookings for the same doctor on the same date 
  const duplicateBooking = await Appointment.findOne({
    patientId,
    doctorId,
    date,
    status: { $in: ['scheduled', 'completed'] }
  });

  if (duplicateBooking) {
    throw { status: 409, message: 'Conflict: You already hold an active appointment reservation with this doctor on this calendar date.' };
  }

  // Step 2: Query Clinic Service live to guarantee the slot is unassigned 
  const verifiedSlot = await clinicClient.checkSlotAvailable(slotId, doctorId, date);
  if (!verifiedSlot) {
    throw { status: 409, message: 'Conflict: The selected 40-minute slot is no longer available or has been claimed.' };
  }

  // Step 3: Find or automatically establish the permanent Patient Identity Card (ካርድ) [cite: 25, 27, 74]
  let card = await PatientCard.findOne({ patientId, isActive: true });
  if (!card) {
    console.log(`ℹ️ First-time patient detected. Provisioning a new sequential clinical card record...`);
    const sequentialCardNumber = await generateCardNumber(); // Generates CLN-YYYY-NNNNN [cite: 20]
    
    card = await PatientCard.create({
      patientId,
      cardNumber: sequentialCardNumber
    });
  }

  // Step 4: Calculate the absolute queue position for this doctor on this day 
  const activeDailyBookingsCount = await Appointment.countDocuments({
    doctorId,
    date,
    status: { $in: ['scheduled', 'completed'] }
  });
  const assignedQueueNumber = activeDailyBookingsCount + 1; // First is 1, second is 2, etc. [cite: 48, 49]

  // Step 5: Temporarily communicate with Clinic Service to lock down the slot 
  // We pass a placeholder string initially, which we will update once the record is saved
  const allocationSuccess = await clinicClient.lockSlot(slotId, 'PENDING_SAVE', incomingToken);
  if (!allocationSuccess) {
    throw { status: 502, message: 'Bad Gateway: Failed to lock slot. Clinic Service might be offline.' };
  }

  // Step 6: Save the complete Appointment document instance 
  try {
    const freshAppointment = new Appointment({
      cardNumber: card.cardNumber,
      patientId,
      doctorId,
      slotId,
      date,
      startTime: verifiedSlot.startTime,
      endTime: verifiedSlot.endTime,
      queueNumber: assignedQueueNumber,
      reasonForVisit: bookingData.reasonForVisit || '',
      status: 'scheduled'
    });

    const savedRecord = await freshAppointment.save();

    // Re-hit the lock endpoint to accurately link the true finalized appointment database ID
    await clinicClient.lockSlot(slotId, savedRecord._id.toString(), incomingToken);

    return savedRecord;
  } catch (dbError) {
    console.error(`❌ Database write abort sequence initiated: ${dbError.message}`);
    // Safety Fallback Rollback: Release the slot back to available if saving fails 
    await clinicClient.releaseSlot(slotId, incomingToken);
    throw { status: 500, message: `Internal Error: Booking aborted during save operations. ${dbError.message}` };
  }
};