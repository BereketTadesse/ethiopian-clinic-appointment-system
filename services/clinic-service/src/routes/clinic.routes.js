import express from 'express';
import { 
  getClinicProfile, 
  getClinicStatus, 
  updateClinicProfile 
  } from '../controllers/clinic.controller.js';
import {getAllDoctors, getDoctorById, createDoctorProfile, doctorSelfUpdate} from '../controllers/doctor.controller.js';
// 🛡️ Import your shared authentication & role guards from your middleware folder
import { protect } from '../middleware/auth.js';
import { authorizeAdmin,authorizeDoctor } from '../middleware/auth.js';
import {getDoctorAvailableSlots } from '../controllers/slot.controller.js'
const router = express.Router();


router.get('/', getClinicProfile);
router.get('/status', getClinicStatus);
router.put('/updateClinicProfile', protect, authorizeAdmin, updateClinicProfile);

// route for the doctors

router.get('/getAllDoctors', getAllDoctors);
router.get('/getAllDoctors/:id', getDoctorById);

router.post('/createDoctorProfile', protect, authorizeAdmin, createDoctorProfile);
router.patch('/me', protect, authorizeDoctor, doctorSelfUpdate);


// Public route for patients browsing available doctor slots
router.get('/:id/slots', getDoctorAvailableSlots);

export default router;