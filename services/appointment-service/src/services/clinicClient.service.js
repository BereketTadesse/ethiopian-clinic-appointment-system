import axios from 'axios';

const rawUrl = process.env.CLINIC_SERVICE_URL || 'http://localhost:3002';
const base = rawUrl.replace(/\/+$/, '');
const CLINIC_API_URL = base.endsWith('/api/clinics') ? base : `${base}/api/clinics`;

/**
 * HTTP Client Bridge: Communicates directly with the Clinic Service
 */
export const clinicClient = {
  /**
   * Hits GET /api/clinics/:doctorId/slots?date=... to find if a specific slot is available
   */
  checkSlotAvailable: async (slotId, doctorId, dateStr) => {
    try {
      const response = await axios.get(`${CLINIC_API_URL}/${doctorId}/slots`, {
        params: { date: dateStr }
      });

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        // Look through the array of available slots for our specific slotId
        const targetSlot = response.data.data.find(s => String(s._id) === String(slotId));
        return targetSlot || null;
      }
      return null;
    } catch (error) {
      console.error(`❌ Clinic Client failed to check slot availability: ${error.response?.data?.message || error.message}`);
      throw new Error(`Clinic Service unreachable: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Hits PATCH /api/clinics/slots/:id/status to change the slot state to 'booked' or 'reserved'
   */
  lockSlot: async (slotId, appointmentId, incomingToken) => {
    try {
      const headers = {};
      if (process.env.INTERNAL_SERVICE_SECRET) {
        headers['x-internal-service-secret'] = process.env.INTERNAL_SERVICE_SECRET;
      }
      if (incomingToken) {
        headers.Authorization = `Bearer ${incomingToken}`;
        headers.Cookie = `token=${incomingToken}`;
      }

      const response = await axios.patch(
        `${CLINIC_API_URL}/slots/${slotId}/status`,
        { status: 'booked', appointmentId },
        { headers }
      );
      return Boolean(response.data && response.data.success);
    } catch (error) {
      console.error(`❌ Clinic Client failed to lock slot ${slotId}: ${error.response?.data?.message || error.message}`);
      return false;
    }
  },

  /**
   * Fallback Safety Bridge: Releases a slot back to 'available' if a database operation fails halfway through or on cancellation
   */
  releaseSlot: async (slotId, incomingToken) => {
    const headers = {};
    if (process.env.INTERNAL_SERVICE_SECRET) {
      headers['x-internal-service-secret'] = process.env.INTERNAL_SERVICE_SECRET;
    }
    if (incomingToken) {
      headers.Authorization = `Bearer ${incomingToken}`;
      headers.Cookie = `token=${incomingToken}`;
    }

    try {
      const response = await axios.patch(
        `${CLINIC_API_URL}/slots/${slotId}/status`,
        { status: 'available', appointmentId: null },
        { headers }
      );
      if (response.data && response.data.success) {
        console.log(`♻️ Successfully rolled back and released slot ${slotId} to inventory.`);
        return true;
      }
      return false;
    } catch (error) {
      // Secondary fallback to POST /releaseSlot/:id
      try {
        await axios.post(
          `${CLINIC_API_URL}/releaseSlot/${slotId}`,
          { slotId },
          { headers }
        );
        console.log(`♻️ Successfully rolled back and released slot ${slotId} to inventory (fallback).`);
        return true;
      } catch (fallbackErr) {
        console.error(`❌ Critical: Failed to release slot ${slotId} during rollback: ${error.response?.data?.message || error.message}`);
        return false;
      }
    }
  }
};