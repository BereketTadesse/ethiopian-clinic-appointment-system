import axios from 'axios';

const rawUrl = process.env.CLINIC_SERVICE_URL || 'http://localhost:3002';
const base = rawUrl.replace(/\/+$/, '');
const CLINIC_API_URL = base.endsWith('/api/clinics') ? base : `${base}/api/clinics`;

// Never let a slow/hung clinic-service hang a patient's booking request.
const CLINIC_TIMEOUT_MS = Number(process.env.CLINIC_SERVICE_TIMEOUT_MS) || 5000;

const buildHeaders = (incomingToken) => {
  const headers = {};
  if (process.env.INTERNAL_SERVICE_SECRET) {
    headers['x-internal-service-secret'] = process.env.INTERNAL_SERVICE_SECRET;
  }
  if (incomingToken) {
    headers.Authorization = `Bearer ${incomingToken}`;
  }
  return headers;
};

/** Normalise an axios error into { ok:false, status, message }. status 0 = unreachable/timeout. */
const toFailure = (error) => ({
  ok: false,
  status: error.response?.status || 0,
  message: error.response?.data?.message || error.message
});

/**
 * HTTP Client Bridge: Communicates directly with the Clinic Service
 */
export const clinicClient = {
  /**
   * GET /api/clinics/:doctorId/slots?date=... and return the slot if it is still available.
   * @returns the slot object, or null if it is not (or no longer) available
   * @throws {{status: 503}} if clinic-service cannot be reached
   */
  checkSlotAvailable: async (slotId, doctorId, dateStr) => {
    try {
      const response = await axios.get(`${CLINIC_API_URL}/${doctorId}/slots`, {
        params: { date: dateStr },
        timeout: CLINIC_TIMEOUT_MS
      });

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        return response.data.data.find((s) => String(s._id) === String(slotId)) || null;
      }
      return null;
    } catch (error) {
      const failure = toFailure(error);
      console.error(`❌ Clinic Client failed to check slot availability: ${failure.message}`);
      // A 4xx (e.g. unknown doctor) means "not available"; anything else is an outage.
      if (failure.status >= 400 && failure.status < 500) return null;
      throw { status: 503, message: 'Booking is temporarily unavailable (clinic service unreachable). Please try again shortly.' };
    }
  },

  /**
   * PATCH /api/clinics/slots/:id/status -> 'booked', tagged with the appointment id.
   * @returns {{ok:true}} | {{ok:false, status:number, message:string}}
   *   status 409 = the slot is already booked by someone else; 0 = unreachable/timeout.
   */
  lockSlot: async (slotId, appointmentId, incomingToken) => {
    try {
      const response = await axios.patch(
        `${CLINIC_API_URL}/slots/${slotId}/status`,
        { status: 'booked', appointmentId },
        { headers: buildHeaders(incomingToken), timeout: CLINIC_TIMEOUT_MS }
      );
      return response.data?.success ? { ok: true } : { ok: false, status: 502, message: 'Unexpected clinic-service response' };
    } catch (error) {
      const failure = toFailure(error);
      console.error(`❌ Clinic Client failed to lock slot ${slotId}: [${failure.status}] ${failure.message}`);
      return failure;
    }
  },

  /**
   * Release a slot back to 'available' (cancellation, or rollback after a failed save).
   * @returns true if released
   */
  releaseSlot: async (slotId, incomingToken) => {
    const headers = buildHeaders(incomingToken);
    try {
      const response = await axios.patch(
        `${CLINIC_API_URL}/slots/${slotId}/status`,
        { status: 'available', appointmentId: null },
        { headers, timeout: CLINIC_TIMEOUT_MS }
      );
      if (response.data && response.data.success) {
        console.log(`♻️ Released slot ${slotId} back to inventory.`);
        return true;
      }
      return false;
    } catch (error) {
      // Secondary fallback to POST /releaseSlot/:id
      try {
        await axios.post(`${CLINIC_API_URL}/releaseSlot/${slotId}`, { slotId }, { headers, timeout: CLINIC_TIMEOUT_MS });
        console.log(`♻️ Released slot ${slotId} back to inventory (fallback).`);
        return true;
      } catch (fallbackErr) {
        console.error(`❌ Critical: Failed to release slot ${slotId}: ${toFailure(error).message}`);
        return false;
      }
    }
  }
};
