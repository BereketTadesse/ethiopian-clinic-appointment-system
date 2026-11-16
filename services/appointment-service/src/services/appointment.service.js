import mongoose from 'mongoose';
import Appointment from '../models/appointment.model.js';
import { findOrCreateCard } from './card.service.js';
import { clinicClient } from './clinicClient.service.js';
import { userClient } from './userClient.service.js';
import { withQueueNumber, withQueueNumbers } from './queue.service.js';
import { clinicDate, clinicTime, isValidDateString } from '../utils/time.js';

const isDuplicateSlotError = (err) => err?.code === 11000 && err.keyPattern?.slotId;

/**
 * Resolve who the visit is for.
 *  - No familyMemberId: the account holder.
 *  - familyMemberId: must be an active family member that belongs to THIS account
 *    (verified with user-service). Name and relationship come from user-service,
 *    not from the client, so the label always matches the real record.
 */
const resolvePerson = async (patientId, bookingData) => {
  const { familyMemberId } = bookingData;
  const self = {
    familyMemberId: null,
    patientName: bookingData.patientName || '',
    forPerson: 'Self'
  };
  if (familyMemberId === undefined || familyMemberId === null || familyMemberId === '' || familyMemberId === 'self') {
    return self;
  }
  if (!mongoose.Types.ObjectId.isValid(familyMemberId)) {
    throw { status: 400, message: 'Invalid familyMemberId.' };
  }

  const member = await userClient.getFamilyMember(String(familyMemberId)); // throws 503 if unreachable
  if (!member || String(member.accountId) !== String(patientId)) {
    // Same answer for "doesn't exist" and "belongs to someone else": don't leak other accounts' members
    throw { status: 404, message: 'Family member not found on this account.' };
  }
  if (member.isActive === false) {
    throw { status: 400, message: 'This family member has been removed from the account.' };
  }
  if (member.isSelf) {
    // The account holder's own "self" family record: same person, same card.
    return { ...self, patientName: member.fullName || self.patientName };
  }
  return {
    familyMemberId: new mongoose.Types.ObjectId(String(familyMemberId)),
    patientName: member.fullName,
    forPerson: `${member.fullName} (${member.relationship})`
  };
};

/**
 * Core Orchestrator: the complete clinic booking sequence.
 *
 *  1. Validate the date (real date, not in the past — Addis Ababa time).
 *  1b. Resolve the person: account holder, or a verified family member of this account.
 *  2. One active appointment per PERSON per doctor per day.
 *  3. Ask clinic-service whether the slot is still available.
 *  4. Find or create that person's own permanent card (race-safe counter).
 *  5. Lock the slot in clinic-service, tagged with this appointment's pre-generated id.
 *     A second booking racing for the same slot gets a 409 from clinic-service here.
 *  6. Save the appointment. On failure, release the slot (unless another active
 *     appointment already owns it).
 *  7. Return the appointment with its time-ordered queue number.
 */
export const createNewAppointment = async (bookingData, patientId, incomingToken) => {
  const { doctorId, slotId, date } = bookingData;

  // Step 1: Date sanity (Bug 4: "today" is Addis Ababa's today, not UTC's)
  if (!isValidDateString(date)) {
    throw { status: 400, message: 'Invalid date. Use the format YYYY-MM-DD.' };
  }
  const today = clinicDate();
  if (date < today) {
    throw { status: 400, message: 'You cannot book an appointment for a past date.' };
  }

  // Step 1b: Who is the visit for? The account holder, or a verified family member of this account.
  const person = await resolvePerson(patientId, bookingData);

  // Step 2: One active booking per PERSON per doctor per day. Different family members
  // (e.g. a parent and two children) can see the same doctor on the same day.
  const duplicateBooking = await Appointment.findOne({
    patientId,
    familyMemberId: person.familyMemberId,
    doctorId,
    date,
    status: { $in: ['scheduled', 'completed'] }
  });
  if (duplicateBooking) {
    throw {
      status: 409,
      message: person.familyMemberId
        ? `Conflict: ${person.patientName} already has an appointment with this doctor on this date.`
        : 'Conflict: You already hold an active appointment reservation with this doctor on this calendar date.'
    };
  }

  // Step 3: Query Clinic Service live to guarantee the slot is unassigned (throws 503 if unreachable)
  const verifiedSlot = await clinicClient.checkSlotAvailable(slotId, doctorId, date);
  if (!verifiedSlot) {
    throw { status: 409, message: 'Conflict: The selected 40-minute slot is no longer available or has been claimed.' };
  }
  if (date === today && verifiedSlot.startTime <= clinicTime()) {
    throw { status: 400, message: 'This time slot has already started or passed. Please choose a later slot.' };
  }

  // Step 4: Permanent Patient Identity Card (ካርድ) of THIS person, created on their first booking
  const card = await findOrCreateCard(patientId, person.familyMemberId);

  // Step 5: Lock the slot with this appointment's real id (pre-generated, so no placeholder
  // and no second "finalise" call is needed)
  const appointmentId = new mongoose.Types.ObjectId();
  const lock = await clinicClient.lockSlot(slotId, appointmentId.toString(), incomingToken);
  if (!lock.ok) {
    if (lock.status === 409) {
      throw { status: 409, message: 'This slot was just taken by another patient. Please choose another time.' };
    }
    throw { status: 503, message: 'Booking is temporarily unavailable (could not reserve the slot). Please try again shortly.' };
  }

  // Step 6: Save the appointment
  try {
    const saved = await Appointment.create({
      _id: appointmentId,
      cardNumber: card.cardNumber,
      patientId,
      familyMemberId: person.familyMemberId,
      patientName: person.patientName,
      forPerson: person.forPerson,
      doctorId,
      slotId,
      date,
      startTime: verifiedSlot.startTime,
      endTime: verifiedSlot.endTime,
      reasonForVisit: bookingData.reasonForVisit || '',
      status: 'scheduled'
    });

    // Step 7: queue number = position in the doctor's day by appointment time
    return await withQueueNumber(saved);
  } catch (dbError) {
    if (isDuplicateSlotError(dbError)) {
      // Another ACTIVE appointment in our database already owns this slot. Do not release it:
      // that would mark a genuinely booked slot as free in clinic-service.
      throw { status: 409, message: 'This slot was just taken by another patient. Please choose another time.' };
    }
    console.error(`❌ Booking save failed, releasing slot ${slotId}: ${dbError.message}`);
    await clinicClient.releaseSlot(slotId, incomingToken);
    throw { status: 500, message: 'Internal Error: Booking could not be saved. Please try again.' };
  }
};

/**
 * Upcoming (scheduled) appointments for a patient, with live queue numbers
 */
export const getAppointmentsByPatientId = async (patientId) => {
  const appointments = await Appointment.find({ patientId, status: 'scheduled' }).sort({ date: 1, startTime: 1 });
  return withQueueNumbers(appointments);
};

/**
 * Complete appointment history for a patient (all statuses, newest first)
 */
export const getAppointmentHistoryByPatientId = async (patientId) => {
  const appointments = await Appointment.find({ patientId }).sort({ date: -1, startTime: -1 });
  return withQueueNumbers(appointments);
};

/**
 * Cancel a scheduled appointment by patient
 */
export const cancelAppointmentByPatient = async (appointmentId, patientId, cancelReason, incomingToken) => {
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw { status: 404, message: 'Appointment not found.' };
  }
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

  await clinicClient.releaseSlot(appointment.slotId, incomingToken);

  appointment.status = 'cancelled';
  appointment.cancelReason = cancelReason || 'Cancelled by patient';
  appointment.cancelledAt = new Date();
  appointment.cancelledBy = 'patient';

  return await appointment.save();
};

// ── Doctor Endpoints ──────────────────────────────────────────

/**
 * GET /appointments/my-queue
 * Today's (Addis Ababa) remaining queue, ordered by appointment time.
 * Queue numbers count completed visits too, so a patient's number doesn't change
 * when the patients before them are seen.
 */
export const getDoctorTodayQueue = async (doctorId) => {
  const today = clinicDate();
  const todays = await Appointment.find({ doctorId, date: today, status: 'scheduled' })
    .select('cardNumber patientId patientName forPerson queueNumber startTime endTime date status doctorId reasonForVisit');
  const numbered = await withQueueNumbers(todays);
  return numbered.sort((a, b) => a.queueNumber - b.queueNumber);
};

/**
 * PATCH /appointments/:id/complete
 * Doctor marks the visit as done and fills clinical notes
 */
export const completeAppointment = async (appointmentId, doctorId, { doctorNotes, prescription, followUpDate }) => {
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw { status: 404, message: 'Appointment not found or does not belong to this doctor.' };
  }
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

  return withQueueNumber(await appointment.save());
};

/**
 * GET /appointments/:id
 * Doctor views full details of one appointment including patient's card history
 */
export const getAppointmentById = async (appointmentId, doctorId) => {
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw { status: 404, message: 'Appointment not found or does not belong to this doctor.' };
  }
  const appointment = await Appointment.findOne({ _id: appointmentId, doctorId });

  if (!appointment) {
    throw { status: 404, message: 'Appointment not found or does not belong to this doctor.' };
  }

  const cardHistory = await Appointment.find({ cardNumber: appointment.cardNumber })
    .sort({ date: -1, startTime: -1 });

  return { appointment: await withQueueNumber(appointment), cardHistory };
};

// ── Admin Endpoints ───────────────────────────────────────────

/**
 * GET /appointments
 * All appointments, optionally filtered by date, doctorId, or status. Within a day,
 * ordered by appointment time.
 */
export const getAllAppointments = async ({ date, doctorId, status }) => {
  const filter = {};
  if (date) filter.date = date;
  if (doctorId) filter.doctorId = doctorId;
  if (status) filter.status = status;

  const appointments = await Appointment.find(filter).sort({ date: -1, startTime: 1 });
  return withQueueNumbers(appointments);
};

/**
 * PATCH /appointments/:id/cancel (staff version)
 * Staff cancel any appointment regardless of ownership; the slot is released.
 */
export const adminCancelAppointment = async (appointmentId, cancelReason, incomingToken) => {
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw { status: 404, message: 'Appointment not found.' };
  }
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

  await clinicClient.releaseSlot(appointment.slotId, incomingToken);

  appointment.status = 'cancelled';
  appointment.cancelReason = cancelReason;
  appointment.cancelledAt = new Date();
  appointment.cancelledBy = 'staff';

  return await appointment.save();
};

// ── Internal (service-to-service) ─────────────────────────────

/**
 * Cancel every upcoming scheduled appointment of a doctor who is being deactivated
 * (Bug 7). "Upcoming" = today (Addis Ababa) or later. Past and completed visits are
 * left untouched. Slots are not released: the doctor is unavailable.
 * @returns number of appointments cancelled
 */
export const cancelUpcomingForDoctor = async (doctorId, reason) => {
  const result = await Appointment.updateMany(
    { doctorId, status: 'scheduled', date: { $gte: clinicDate() } },
    {
      $set: {
        status: 'cancelled',
        cancelReason: reason || 'The doctor is no longer available. Please book with another doctor.',
        cancelledAt: new Date(),
        cancelledBy: 'system'
      }
    }
  );
  return result.modifiedCount;
};
