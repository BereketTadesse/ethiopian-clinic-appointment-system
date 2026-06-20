import express from 'express';
import { bookAppointment } from '../controllers/appointment.controller.js';
import { protect ,authorizeAdmin,authorizeDoctor,authorizePatient} from '../middleware/auth.js'; // Protect to ensure user is logged in 

const router = express.Router();

// Mount the booking post route behind an authentication guard layer
router.post('/', protect, bookAppointment);

export default router;