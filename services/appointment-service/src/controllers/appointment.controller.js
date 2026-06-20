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
    const incomingToken = req.cookies.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

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