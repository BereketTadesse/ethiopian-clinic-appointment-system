import mongoose from 'mongoose';
import axios from 'axios';
import * as appointmentService from '../services/appointment.service.js';

/**
 * @desc    Submit a new appointment reservation request
 * @route   POST /api/appointments
 * @access  Private (Patient or Staff)
 */
export const bookAppointment = async (req, res) => {
  try {
    const { doctorId, slotId, date } = req.body;

    // Direct input validation 
    if (!doctorId || !slotId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Inputs: doctorId, slotId, and target date parameters are all strictly required.'
      });
    }

    const incomingToken = req.headers.authorization?.split(' ')[1] || req.cookies?.token || null;

    let patientId;
    if (req.user?.role === 'patient') {
      // 🔒 Patients are strictly locked to their own account identity
      patientId = req.user.id;
    } else {
      // Clinical Staff (admin, receptionist, doctor) booking on behalf of a patient
      patientId = req.body.patientId;
      if (!patientId) {
        return res.status(400).json({
          success: false,
          message: 'Patient ID is strictly required when booking appointments as clinical staff.'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(patientId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Patient ID format.'
        });
      }

      // Verify with User Service that this target patient exists
      try {
        const userServiceBase = (process.env.USER_SERVICE_URL || 'http://localhost:3001').replace(/\/+$/, '');
        const profileUrl = userServiceBase.endsWith('/api/users')
          ? `${userServiceBase}/profile/${patientId}`
          : `${userServiceBase}/api/users/profile/${patientId}`;

        const headers = {};
        if (incomingToken) {
          headers.Authorization = `Bearer ${incomingToken}`;
          headers.Cookie = `token=${incomingToken}`;
        }
        if (process.env.INTERNAL_SERVICE_SECRET) {
          headers['x-internal-service-secret'] = process.env.INTERNAL_SERVICE_SECRET;
        }

        const userRes = await axios.get(profileUrl, { headers, timeout: 5000 });
        const coreUser = userRes.data?.data?.user;
        if (!coreUser || coreUser.role !== 'patient') {
          return res.status(404).json({
            success: false,
            message: 'Target user record does not exist or is not a patient account.'
          });
        }
      } catch (err) {
        if (err.response?.status === 404) {
          return res.status(404).json({
            success: false,
            message: 'No patient record found matching the provided patient ID.'
          });
        }
        // Fail closed: never create an appointment (and a permanent card) for a patient we could not verify.
        console.error(`❌ Could not verify patient ${patientId} with User Service: ${err.message}`);
        return res.status(503).json({
          success: false,
          message: 'Cannot verify the patient right now. Please try again in a moment.'
        });
      }
    }

    // Call our core business logic workflow orchestrator
    const appointment = await appointmentService.createNewAppointment(req.body, patientId, incomingToken);

    return res.status(201).json({
      success: true,
      message: `🎉 Appointment booked for ${appointment.date} at ${appointment.startTime}. Your queue number is ${appointment.queueNumber}.`,
      data: appointment
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Critical failure handling appointment processing operations.'
    });
  }
};

export const getMyAppointments = async (req, res) => {
  try {
    const patientId = req.user.id; // Appended securely from validation middlewares 
    const incomingToken = req.headers.authorization?.split(' ')[1] || null;

    // Call our core business logic workflow orchestrator
    const appointments = await appointmentService.getAppointmentsByPatientId(patientId, incomingToken);

    return res.status(200).json({
      success: true,
      message: '🎉 Appointments successfully fetched.',
      data: appointments
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Critical failure handling appointment processing operations.'
    });
  }
};

export const getAppointmentHistory = async (req, res) => {
  try {
    const patientId = req.user.id; // Appended securely from validation middlewares 
    const incomingToken = req.headers.authorization?.split(' ')[1] || null;

    // Call our core business logic workflow orchestrator
    const appointments = await appointmentService.getAppointmentHistoryByPatientId(patientId, incomingToken);

    return res.status(200).json({
      success: true,
      message: '🎉 Appointments successfully fetched.',
      data: appointments
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Critical failure handling appointment processing operations.'
    });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { cancelReason } = req.body;
    const patientId = req.user.id;
    const incomingToken = req.headers.authorization?.split(' ')[1] || null;

    const cancelledAppointment = await appointmentService.cancelAppointmentByPatient(
      appointmentId,
      patientId,
      cancelReason,
      incomingToken
    );

    return res.status(200).json({
      success: true,
      message: '🎉 Appointment successfully cancelled.',
      data: cancelledAppointment
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Critical failure handling appointment processing operations.'
    });
  }
};

// ── Doctor Endpoints ──────────────────────────────────────────

/**
 * @desc    Doctor sees today's remaining queue, ordered by appointment time
 * @route   GET /api/appointments/my-queue
 * @access  Private (Doctor Only)
 */
export const getDoctorQueue = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const queue = await appointmentService.getDoctorTodayQueue(doctorId);

    return res.status(200).json({
      success: true,
      count: queue.length,
      data: queue
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch doctor queue.'
    });
  }
};

/**
 * @desc    Doctor marks appointment as completed and fills clinical notes
 * @route   PATCH /api/appointments/:id/complete
 * @access  Private (Doctor Only)
 */
export const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.id;
    const { doctorNotes, prescription, followUpDate } = req.body;

    const completed = await appointmentService.completeAppointment(id, doctorId, {
      doctorNotes,
      prescription,
      followUpDate
    });

    return res.status(200).json({
      success: true,
      message: '✅ Appointment marked as completed.',
      data: completed
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to complete appointment.'
    });
  }
};

/**
 * @desc    Doctor views full details of one appointment including card history
 * @route   GET /api/appointments/:id
 * @access  Private (Doctor Only)
 */
export const getAppointmentDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.id;

    const result = await appointmentService.getAppointmentById(id, doctorId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch appointment details.'
    });
  }
};

// ── Admin Endpoints ───────────────────────────────────────────

/**
 * @desc    Admin gets all appointments with optional filters: date, doctorId, status
 * @route   GET /api/appointments
 * @access  Private (Admin Only)
 */
export const getAllAppointmentsAdmin = async (req, res) => {
  try {
    const { date, doctorId, status } = req.query;

    const appointments = await appointmentService.getAllAppointments({ date, doctorId, status });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch appointments.'
    });
  }
};

/**
 * @desc    Admin / Receptionist cancels any appointment. Requires cancelReason. Releases slot in Clinic Service.
 * @route   PATCH /api/appointments/:id/cancel
 * @access  Private (Staff Only)
 */
export const adminCancelAppointmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelReason } = req.body;
    const incomingToken = req.headers.authorization?.split(' ')[1] || req.cookies?.token || null;

    const cancelled = await appointmentService.adminCancelAppointment(id, cancelReason || 'Cancelled by clinic staff', incomingToken);

    return res.status(200).json({
      success: true,
      message: '✅ Appointment cancelled by admin. Slot released back to availability.',
      data: cancelled
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to cancel appointment.'
    });
  }
};

/**
 * @desc    Unified cancellation endpoint: routes based on user role (patient vs staff)
 * @route   PATCH /api/appointments/:id/cancel
 * @access  Private (Patient or Staff)
 */
export const cancelAppointmentUnified = async (req, res) => {
  try {
    const id = req.params.id || req.params.appointmentId;
    const { cancelReason } = req.body;
    const incomingToken = req.headers.authorization?.split(' ')[1] || req.cookies?.token || null;

    if (['admin', 'receptionist'].includes(req.user?.role)) {
      const cancelled = await appointmentService.adminCancelAppointment(
        id,
        cancelReason || 'Cancelled by clinic staff',
        incomingToken
      );
      return res.status(200).json({
        success: true,
        message: '✅ Appointment cancelled by clinic staff. Slot released back to availability.',
        data: cancelled
      });
    } else if (req.user?.role === 'patient') {
      const cancelled = await appointmentService.cancelAppointmentByPatient(
        id,
        req.user.id,
        cancelReason || 'Patient requested cancellation',
        incomingToken
      );
      return res.status(200).json({
        success: true,
        message: '🎉 Appointment successfully cancelled. Slot released back to availability.',
        data: cancelled
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Unauthorized role to cancel appointment.'
      });
    }
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to cancel appointment.'
    });
  }
};

/**
 * @desc    Internal: cancel all upcoming appointments of a doctor being deactivated
 * @route   PATCH /api/appointments/internal/doctors/:doctorId/cancel-upcoming
 * @access  Internal services only (x-internal-service-secret)
 */
export const cancelUpcomingForDoctorInternal = async (req, res) => {
  const { doctorId } = req.params;
  const cancelledCount = await appointmentService.cancelUpcomingForDoctor(doctorId, req.body?.reason);
  return res.status(200).json({
    success: true,
    message: `Cancelled ${cancelledCount} upcoming appointment(s) for doctor ${doctorId}.`,
    cancelledCount
  });
};
