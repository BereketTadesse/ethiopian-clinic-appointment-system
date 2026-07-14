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

/**
 * Fetch active/scheduled appointments for a specific patient
 */
export const getAppointmentsByPatientId = async (patientId, incomingToken) => {
  try {
    return await Appointment.find({
      patientId,
      status: 'scheduled'
    }).sort({ date: 1, startTime: 1 });
  } catch (error) {
    throw new Error(`Failed to fetch appointments: ${error.message}`);
  }
};

/**
 * Fetch complete appointment history for a specific patient (all statuses, newest first)
 */
export const getAppointmentHistoryByPatientId = async (patientId, incomingToken) => {
  try {
    return await Appointment.find({
      patientId
    }).sort({ date: -1, startTime: -1 });
  } catch (error) {
    throw new Error(`Failed to fetch appointment history: ${error.message}`);
  }
};

/**
 * Cancel a scheduled appointment by patient
 */
export const cancelAppointmentByPatient = async (appointmentId, patientId, cancelReason, incomingToken) => {
  const appointment = await Appointment.findOne({ _id: appointmentId, patientId });

  if (!appointment) {
    throw { status: 404, message: 'Appointment not found.' };
  }

  if (appointment.status === 'completed') {
    throw { status: 400, message: 'Cannot cancel a completed appointment.' };
  }

  if (appointment.status === 'cancelled') {
    throw { status: 400, message: 'Appointment is already cancelled.' };
  }

  // Release the slot in clinic-service
  await clinicClient.releaseSlot(appointment.slotId, incomingToken);

  // Update appointment status to cancelled
  appointment.status = 'cancelled';
  appointment.cancelReason = cancelReason || 'Cancelled by patient';
  appointment.cancelledAt = new Date();

  return await appointment.save();
};

// ── Doctor Endpoints ──────────────────────────────────────────

/**
 * GET /appointments/my-queue
 * Doctor sees today's full scheduled queue, ordered by queueNumber
 */
export const getDoctorTodayQueue = async (doctorId) => {
  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

  return await Appointment.find({
    doctorId,
    date: today,
    status: 'scheduled'
  })
    .sort({ queueNumber: 1 }) // Queue position order: 1, 2, 3...
    .select('cardNumber patientId queueNumber startTime endTime date'); // Only fields the doctor needs
};

/**
 * PATCH /appointments/:id/complete
 * Doctor marks the visit as done and fills clinical notes
 */
export const completeAppointment = async (appointmentId, doctorId, { doctorNotes, prescription, followUpDate }) => {
  const appointment = await Appointment.findOne({ _id: appointmentId, doctorId });

  if (!appointment) {
    throw { status: 404, message: 'Appointment not found or does not belong to this doctor.' };
  }

  if (appointment.status !== 'scheduled') {
    throw { status: 400, message: `Cannot complete an appointment with status '${appointment.status}'.` };
  }

  appointment.status = 'completed';
  if (doctorNotes !== undefined) appointment.doctorNotes = doctorNotes;
  if (prescription !== undefined) appointment.prescription = prescription;
  if (followUpDate !== undefined) appointment.followUpDate = followUpDate;

  return await appointment.save();
};

/**
 * GET /appointments/:id
 * Doctor views full details of one appointment including patient's card history
 */
export const getAppointmentById = async (appointmentId, doctorId) => {
  const appointment = await Appointment.findOne({ _id: appointmentId, doctorId });

  if (!appointment) {
    throw { status: 404, message: 'Appointment not found or does not belong to this doctor.' };
  }

  // Fetch all past appointments for this patient (card history)
  const cardHistory = await Appointment.find({
    cardNumber: appointment.cardNumber
  }).sort({ date: -1, startTime: -1 });

  return { appointment, cardHistory };
};

// ── Admin Endpoints ───────────────────────────────────────────

/**
 * GET /appointments
 * Admin gets ALL appointments, optionally filtered by date, doctorId, or status
 */
export const getAllAppointments = async ({ date, doctorId, status }) => {
  const filter = {};

  if (date)     filter.date     = date;      // e.g. '2026-07-14'
  if (doctorId) filter.doctorId = doctorId;  // filter by a specific doctor
  if (status)   filter.status   = status;    // 'scheduled' | 'completed' | 'cancelled'

  return await Appointment.find(filter).sort({ date: -1, queueNumber: 1 });
};

/**
 * PATCH /appointments/:id/cancel  (Admin version)
 * Admin cancels any appointment regardless of ownership, releases the slot in Clinic Service
 */
export const adminCancelAppointment = async (appointmentId, cancelReason, incomingToken) => {
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw { status: 404, message: 'Appointment not found.' };
  }

  if (appointment.status === 'cancelled') {
    throw { status: 400, message: 'Appointment is already cancelled.' };
  }

  if (appointment.status === 'completed') {
    throw { status: 400, message: 'Cannot cancel a completed appointment.' };
  }

  if (!cancelReason) {
    throw { status: 400, message: 'Cancel reason is required for admin cancellation.' };
  }

  // Release the slot back to 'available' in Clinic Service
  await clinicClient.releaseSlot(appointment.slotId, incomingToken);

  appointment.status      = 'cancelled';
  appointment.cancelReason = cancelReason;
  appointment.cancelledAt  = new Date();

  return await appointment.save();
};