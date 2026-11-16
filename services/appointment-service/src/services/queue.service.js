import Appointment, { ACTIVE_STATUSES } from '../models/appointment.model.js';

/**
 * Queue numbers follow APPOINTMENT TIME, not booking order.
 *
 * A patient's queue number is their position in the doctor's day, counting every
 * active (scheduled or completed) appointment, ordered by slot start time.
 * Example: 08:00 → #1, 08:40 → #2, 10:00 → #3, no matter who booked first.
 *
 * It is computed when read (never stored), so:
 *  - two simultaneous bookings can never get the same number (each slot has its own time);
 *  - if an earlier slot is booked or cancelled later, the numbers stay in time order.
 * Cancelled appointments have no queue number (null).
 */

// 'HH:MM' strings are zero-padded, so plain string comparison sorts them chronologically.
const byStartTime = (a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0);

/** Map of appointmentId -> queue number for one doctor on one date. */
const queuePositionsFor = async (doctorId, date) => {
  const active = await Appointment.find({ doctorId, date, status: { $in: ACTIVE_STATUSES } })
    .select('_id startTime')
    .lean();
  active.sort(byStartTime);
  return new Map(active.map((a, i) => [String(a._id), i + 1]));
};

/**
 * Return plain objects with `queueNumber` filled in from the live, time-ordered queue.
 * Accepts Mongoose documents or plain objects.
 */
export const withQueueNumbers = async (appointments) => {
  const list = appointments.map((a) => (typeof a.toObject === 'function' ? a.toObject() : { ...a }));

  const keys = new Set(
    list.filter((a) => ACTIVE_STATUSES.includes(a.status)).map((a) => `${a.doctorId}|${a.date}`)
  );
  const positions = new Map();
  await Promise.all(
    [...keys].map(async (key) => {
      const [doctorId, date] = key.split('|');
      positions.set(key, await queuePositionsFor(doctorId, date));
    })
  );

  return list.map((a) => ({
    ...a,
    queueNumber: ACTIVE_STATUSES.includes(a.status)
      ? positions.get(`${a.doctorId}|${a.date}`)?.get(String(a._id)) ?? null
      : null
  }));
};

/** Single-appointment convenience wrapper. */
export const withQueueNumber = async (appointment) => (await withQueueNumbers([appointment]))[0];
