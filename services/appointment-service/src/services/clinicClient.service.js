import axios from 'axios';

const CLINIC_SERVICE_URL = process.env.CLINIC_SERVICE_URL || 'http://localhost:3002';

/**
 * HTTP Client Bridge: Communicates directly with the Clinic Service
 */
export const clinicClient = {
  /**
   * Hits GET /api/slots?doctorId=...&date=... to find if a specific slot is available
   */
  checkSlotAvailable: async (slotId, doctorId, dateStr) => {
    try {
      const response = await axios.get(`${CLINIC_SERVICE_URL}/api/slots`, {
        params: { doctorId, date: dateStr }
      });

      if (response.data && response.data.success) {
        // Look through the array of available slots for our specific slotId
        const targetSlot = response.data.data.find(s => s._id === slotId);
        return targetSlot || null;
      }
      return null;
    } catch (error) {
      console.error(`❌ Clinic Client failed to check slot availability: ${error.message}`);
      throw new Error(`Clinic Service unreachable: ${error.message}`);
    }
  },

  /**
   * Hits PATCH /api/slots/:id/status to change the slot state to 'booked' or 'reserved'
   */
  lockSlot: async (slotId, appointmentId, incomingToken) => {
    try {
      const response = await axios.patch(
        `${CLINIC_SERVICE_URL}/api/slots/${slotId}/status`,
        { status: 'booked', appointmentId },
        {
          headers: {
            Cookie: `token=${incomingToken}`,
            Authorization: `Bearer ${incomingToken}`
          }
        }
      );
      return response.data && response.data.success;
    } catch (error) {
      console.error(`❌ Clinic Client failed to lock slot ${slotId}: ${error.message}`);
      return false;
    }
  },

  /**
   * Fallback Safety Bridge: Releases a slot back to 'available' if a database operation fails halfway through
   */
  releaseSlot: async (slotId, incomingToken) => {
    try {
      await axios.patch(
        `${CLINIC_SERVICE_URL}/api/slots/${slotId}/status`,
        { status: 'available', appointmentId: null },
        {
          headers: {
            Cookie: `token=${incomingToken}`,
            Authorization: `Bearer ${incomingToken}`
          }
        }
      );
      console.log(`♻️ Successfully rolled back and released slot ${slotId} to inventory.`);
    } catch (error) {
      console.error(`❌ Critical: Failed to release slot ${slotId} during rollback: ${error.message}`);
    }
  }
};