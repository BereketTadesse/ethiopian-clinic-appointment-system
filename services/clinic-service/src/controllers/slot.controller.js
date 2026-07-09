import Slot from '../models/slot.model.js';

export const getDoctorAvailableSlots = async (req, res) => {
  try {
    const doctorId = req.params.id; // Extracted directly from the path variable /:id
    const { date } = req.query;     // Extracted from the query string (?date=...)

    // 1. Check that the date parameter is provided
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Please provide a valid target date query parameter (?date=YYYY-MM-DD).'
      });
    }

    // 2. Query the database to find matching records
    // CRITICAL: Filter only for status: 'available' as specified by the requirements document!
    const availableSlots = await Slot.find({
      doctorId,
      date,
      status: 'available'
    }).sort({ startTime: 1 }); // Sorted chronologically (e.g., 08:00, 08:40)

    // 3. Return the clean list to the patient frontend
    return res.status(200).json({
      success: true,
      count: availableSlots.length,
      data: availableSlots
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve available doctor time slots.',
      error: error.message
    });
  }
};


export const updateSlotStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, appointmentId } = req.body;

    if (!['available', 'booked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid slot status value.' });
    }

    const slot = await Slot.findById(id);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Time slot record not found.' });
    }

    slot.status = status;
    slot.appointmentId = appointmentId || null;
    await slot.save();

    return res.status(200).json({
      success: true,
      message: `Slot status updated successfully to ${status}.`,
      data: slot
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to modify slot status.', error: error.message });
  }
};

export const blockSlots = async (req, res) => {
  try {
    const { doctorId, date, startTime, endTime } = req.body;
    const slot = new Slot({
      doctorId,
      date,
      startTime,
      endTime,
      status: 'blocked'
    });   
    await slot.save();
    return res.status(200).json({
      success: true,
      message: 'Slot blocked successfully',
      data: slot
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to block slot.', error: error.message });
  }
};

export const cancelBlockedSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const slot = await Slot.findById(id);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Time slot record not found.' });
    }
    slot.status = 'available';
    await slot.save();
    return res.status(200).json({
      success: true,
      message: 'Slot cancelled successfully',
      data: slot
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to cancel slot.', error: error.message });
  }
};

export const bookslots = async(req,res)=>{
  try{
    const {slotId,appointmentId} = req.body;
    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Time slot record not found.' });
    }
    if (slot.status !== 'available'){
      return res.status(400).json({ success: false, message: 'Slot is not available.' });
    }
    slot.status = 'booked';
    slot.appointmentId = appointmentId;
    await slot.save();
    return res.status(200).json({
      success: true,
      message: 'Slot booked successfully',
      data: slot
    });
  }catch(error){
    return res.status(500).json({success:false,message:'Failed to book slot.',error:error.message});
  }
}

export const releaseSlot = async(req,res) =>{
  try{
    const {id} = req.params;
    const slot = await Slot.findById(id);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Time slot record not found.' });
    }
    if(slot.status !== 'booked'){
      return res.status(400).json({ success: false, message: 'Slot is not booked.' });
    }
    slot.status = 'available';
    slot.appointmentId = null;
    await slot.save();
    return res.status(200).json({
      success: true,
      message: 'Slot released successfully',
      data: slot
    });
  }catch(error){
    return res.status(500).json({success:false,message:'Failed to release slot.',error:error.message});
  }
}
