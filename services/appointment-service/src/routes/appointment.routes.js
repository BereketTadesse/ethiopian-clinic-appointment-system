import express from 'express';
import {
  bookAppointment,
  getMyAppointments,
  getAppointmentHistory,
  cancelAppointmentUnified,
  getDoctorQueue,
  completeAppointment,
  getAppointmentDetail,
  getAllAppointmentsAdmin,
  cancelUpcomingForDoctorInternal
} from '../controllers/appointment.controller.js';
import {
  protect,
  authorizePatient,
  authorizeDoctor,
  authorizeStaff,
  authorizePatientOrStaff,
  requireInternalService
} from '../middleware/auth.js';
import { bookingRateLimit } from '../middleware/rateLimiter.js';

const router = express.Router();

// ── Internal (service-to-service) ──────────────────────────────
// clinic-service calls this when a doctor is deactivated (Bug 7). Must stay above '/:id' routes.
router.patch('/internal/doctors/:doctorId/cancel-upcoming', requireInternalService, cancelUpcomingForDoctorInternal);

// ── Staff (Admin & Front-Desk Receptionist) Routes ─────────────
// ⚠️ Staff GET / must come BEFORE patient GET /my-appointments etc.
router.get('/', protect, authorizeStaff, getAllAppointmentsAdmin);

// ── Booking Routes (Patient Self-Service & Front-Desk Walk-in) ──
router.post('/', protect, authorizePatientOrStaff, bookingRateLimit, bookAppointment);

// ── Patient Routes ────────────────────────────────────────────
router.get('/my-appointments', protect, authorizePatient, getMyAppointments);
router.get('/history', protect, authorizePatient, getAppointmentHistory);

// ── Cancellation Route (Unified for Patient & Staff) ──────────
router.patch('/:id/cancel', protect, cancelAppointmentUnified);

// ── Doctor Routes ─────────────────────────────────────────────
// ⚠️ /my-queue must come BEFORE /:id to avoid route conflict
router.get('/my-queue', protect, authorizeDoctor, getDoctorQueue);
router.patch('/:id/complete', protect, authorizeDoctor, completeAppointment);
router.get('/:id', protect, authorizeDoctor, getAppointmentDetail);

export default router;