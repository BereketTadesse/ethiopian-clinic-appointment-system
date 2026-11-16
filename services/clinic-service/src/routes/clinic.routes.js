import express from 'express';
import { getClinicProfile, getClinicStatus, createClinicProfile, updateClinicProfile, uploadClinicMedia } from '../controllers/clinic.controller.js';
import { 
  getAllDoctors, 
  getDoctorById, 
  createDoctorProfile, 
  doctorSelfUpdate, 
  updateDoctorProfile, 
  toggleDoctorStatus,
  requestDoctorLeave,
  getMyLeaves,
  getAllDoctorLeaveRequests,
  reviewDoctorLeaveRequest,
  terminateDoctorLeave,
  addDoctorLeave,
  getDoctorLeaves,
  deleteDoctorLeave
} from '../controllers/doctor.controller.js';
import { 
  getAllHolidays, 
  createHoliday, 
  deleteHoliday, 
  seedEthiopianHolidays 
} from '../controllers/holiday.controller.js';
import { protect, authorizeAdmin, authorizeDoctor } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { 
  getDoctorAvailableSlots, 
  updateSlotStatus,
  bookslots, 
  releaseSlot, 
  blockSlots, 
  cancelBlockedSlot,
  triggerExpiredSlotCleanup 
} from '../controllers/slot.controller.js';

const router = express.Router();

// ============================================================
// 🏥 CLINIC PROFILE & OPERATING STATUS
// ============================================================
router.get('/', getClinicProfile);
router.post(
  '/',
  protect,
  authorizeAdmin,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  createClinicProfile
);
router.post(
  '/createClinicProfile',
  protect,
  authorizeAdmin,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  createClinicProfile
);
router.get('/status', getClinicStatus);
router.put(
  '/updateClinicProfile',
  protect,
  authorizeAdmin,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  updateClinicProfile
);
router.post(
  '/upload-media',
  protect,
  authorizeAdmin,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  uploadClinicMedia
);

// ============================================================
// 🏖️ HOLIDAYS & CLINIC CLOSURES (ADMIN MANAGED)
// ============================================================
router.get('/holidays', getAllHolidays);
router.post('/holidays', protect, authorizeAdmin, createHoliday);
router.delete('/holidays/:id', protect, authorizeAdmin, deleteHoliday);
router.post('/holidays/seed-ethiopian', protect, authorizeAdmin, seedEthiopianHolidays);

// ============================================================
// 👨‍⚕️ DOCTORS & LEAVE MANAGEMENT
// ============================================================
router.get('/getAllDoctors', getAllDoctors);
router.get('/getAllDoctors/:id', getDoctorById);
router.post('/createDoctorProfile', protect, authorizeAdmin, createDoctorProfile);
router.patch('/me', protect, authorizeDoctor, doctorSelfUpdate);
router.patch('/admin/updateDoctorProfile/:id', protect, authorizeAdmin, updateDoctorProfile);
router.patch('/admin/toggleDoctorStatus/:id', protect, authorizeAdmin, toggleDoctorStatus);

// Doctor Leaves & Absences (Role Protected Request & Admin Review)
// 🩺 Doctor Role Only: Request leave and view personal leave statuses
router.post('/me/leaves', protect, authorizeDoctor, requestDoctorLeave);
router.get('/me/leaves', protect, authorizeDoctor, getMyLeaves);

// 👑 Admin Role Only: View all doctor leave requests and approve/reject/terminate
router.get('/admin/doctor-leaves', protect, authorizeAdmin, getAllDoctorLeaveRequests);
router.patch('/admin/doctor-leaves/:doctorId/:leaveId', protect, authorizeAdmin, reviewDoctorLeaveRequest);
router.patch('/admin/doctor-leaves/:doctorId/:leaveId/terminate', protect, authorizeAdmin, terminateDoctorLeave);
router.post('/admin/doctor-leaves/:doctorId/:leaveId/terminate', protect, authorizeAdmin, terminateDoctorLeave);

// Doctor specific leave queries / deletions / terminations
router.post('/doctors/:id/leaves', protect, addDoctorLeave);
router.get('/doctors/:id/leaves', protect, getDoctorLeaves);
router.delete('/doctors/:id/leaves/:leaveId', protect, deleteDoctorLeave);
router.patch('/doctors/:id/leaves/:leaveId/terminate', protect, authorizeAdmin, terminateDoctorLeave);

// ============================================================
// ⏰ SLOTS & INVENTORY MANAGEMENT
// ============================================================
// Public route for patients browsing available doctor slots (supports /slots?doctorId=... or /:id/slots)
router.get('/slots', getDoctorAvailableSlots);
router.get('/:id/slots', getDoctorAvailableSlots);

// Slot status management (direct inter-service bridge for lock & release)
router.patch('/slots/:id/status', protect, updateSlotStatus);

// Booking, releasing & blocking
router.post('/bookslots', protect, bookslots);
router.post('/releaseSlot', protect, releaseSlot);
router.post('/releaseSlot/:id', protect, releaseSlot);
router.post('/blockSlots', protect, authorizeAdmin, blockSlots);
router.post('/cancelBlockedSlot', protect, authorizeAdmin, cancelBlockedSlot);
router.post('/cancelBlockedSlot/:id', protect, authorizeAdmin, cancelBlockedSlot);

// Expired slot maintenance cleanup
router.post('/slots/cleanup-expired', protect, authorizeAdmin, triggerExpiredSlotCleanup);

export default router;