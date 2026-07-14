import express from 'express';
import {
  bookAppointment,
  getMyAppointments,
  getAppointmentHistory,
  cancelAppointment,
  getDoctorQueue,
  completeAppointment,
  getAppointmentDetail,
  getAllAppointmentsAdmin,
  adminCancelAppointmentHandler
} from '../controllers/appointment.controller.js';
import { protect, authorizePatient, authorizeDoctor, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// ── Admin Routes ──────────────────────────────────────────────
// ⚠️ Admin GET / must come BEFORE patient GET /my-appointments etc.
router.get('/', protect, authorizeAdmin, getAllAppointmentsAdmin);
router.patch('/:id/cancel', protect, authorizeAdmin, adminCancelAppointmentHandler);

// ── Patient Routes ────────────────────────────────────────────
router.post('/', protect, authorizePatient, bookAppointment);
router.get('/my-appointments', protect, authorizePatient, getMyAppointments);
router.get('/history', protect, authorizePatient, getAppointmentHistory);
router.patch('/:appointmentId/cancel', protect, authorizePatient, cancelAppointment);

// ── Doctor Routes ─────────────────────────────────────────────
// ⚠️ /my-queue must come BEFORE /:id to avoid route conflict
router.get('/my-queue', protect, authorizeDoctor, getDoctorQueue);
router.patch('/:id/complete', protect, authorizeDoctor, completeAppointment);
router.get('/:id', protect, authorizeDoctor, getAppointmentDetail);

export default router;