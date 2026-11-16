import axios from 'axios';

const USER_SERVICE_TIMEOUT_MS = Number(process.env.USER_SERVICE_TIMEOUT_MS) || 5000;

// Read at call time so tests / env changes after import are respected.
const userServiceBase = () => {
  const base = (process.env.USER_SERVICE_URL || 'http://localhost:3001').replace(/\/+$/, '');
  return base.endsWith('/api/users') ? base.slice(0, -'/api/users'.length) : base;
};

const internalHeaders = () => (
  process.env.INTERNAL_SERVICE_SECRET ? { 'x-internal-service-secret': process.env.INTERNAL_SERVICE_SECRET } : {}
);

export const userClient = {
  /**
   * Fetch a family member (and their medical profile) via user-service's internal endpoint.
   * @returns the member, or null if it does not exist
   * @throws {{status: 503}} if user-service cannot be reached
   */
  getFamilyMember: async (familyMemberId) => {
    try {
      const res = await axios.get(
        `${userServiceBase()}/api/users/internal/family-members/${familyMemberId}`,
        { headers: internalHeaders(), timeout: USER_SERVICE_TIMEOUT_MS }
      );
      return res.data?.data || null;
    } catch (error) {
      if (error.response?.status === 404) return null;
      console.error(`❌ User Client failed to fetch family member ${familyMemberId}: ${error.response?.data?.message || error.message}`);
      throw { status: 503, message: 'Cannot verify the family member right now. Please try again in a moment.' };
    }
  }
};
