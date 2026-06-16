import express from 'express';
import { createAppointment, getAppointments } from '../controllers/appointment.controller.js';

const router = express.Router();

router.post('/', createAppointment);
router.get('/', getAppointments);

export default router;
