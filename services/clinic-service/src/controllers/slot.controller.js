import Slot from '../models/slot.model.js';

/**
 * @desc    Get all available 40-minute slots for a specific doctor on a specific date
 * @route   GET /api/slots
 * @access  Public
 */
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    // 1. Validate that the required query parameters are passed
    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both doctorId and date (YYYY-MM-DD) query parameters.'
      });
    }

    // 2. Query the database for slots matching the doctor, date, and status 'available'
    const slots = await Slot.find({
      doctorId,
      date,
      status: 'available'
    }).sort({ startTime: 1 }); // Sort chronologically (e.g., 08:00 before 08:40)

    return res.status(200).json({
      success: true,
      count: slots.length,
      data: slots
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching available time slots',
      error: error.message
    });
  }
};

/**
 * @desc    Manually update a slot status (e.g., lock it when an appointment is booked)
 * @route   PATCH /api/slots/:id/status
 * @access  Private / Internal Service
 */
export const updateSlotStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, appointmentId } = req.body;

    // Validate incoming status rules
    if (!['available', 'reserved', 'booked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid slot status value.' });
    }

    const slot = await Slot.findById(id);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Time slot record not found.' });
    }

    // Update fields
    slot.status = status;
    slot.appointmentId = appointmentId || null;
    
    await slot.save();

    return res.status(200).json({
      success: true,
      message: `Slot state updated successfully to ${status}.`,
      data: slot
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update time slot status',
      error: error.message
    });
  }
};