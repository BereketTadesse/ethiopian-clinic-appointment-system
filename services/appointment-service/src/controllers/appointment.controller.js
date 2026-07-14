import * as appointmentService from '../services/appointment.service.js';

/**
 * @desc    Submit a new appointment reservation request
 * @route   POST /api/appointments
 * @access  Private (Patient Only)
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

    const patientId = req.user.id; // Appended securely from validation middlewares 
    const incomingToken = req.headers.authorization?.split(' ')[1] || null;

    // Call our core business logic workflow orchestrator
    const appointment = await appointmentService.createNewAppointment(req.body, patientId, incomingToken);

    return res.status(201).json({
      success: true,
      message: '🎉 Appointment successfully booked, queue allocation confirmed.',
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
 * @desc    Doctor sees today's scheduled queue ordered by queueNumber
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
 * @desc    Admin cancels any appointment. Requires cancelReason. Releases slot in Clinic Service.
 * @route   PATCH /api/appointments/:id/cancel
 * @access  Private (Admin Only)
 */
export const adminCancelAppointmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelReason } = req.body;
    const incomingToken = req.headers.authorization?.split(' ')[1] || null;

    const cancelled = await appointmentService.adminCancelAppointment(id, cancelReason, incomingToken);

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