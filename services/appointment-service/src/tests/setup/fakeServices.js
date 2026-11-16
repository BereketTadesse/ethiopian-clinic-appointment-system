import { jest } from '@jest/globals';
import mongoose from 'mongoose';

/**
 * In-memory stand-ins for clinic-service and user-service, used through a mocked axios.
 * They follow the real services' contracts closely enough to exercise the booking flow:
 *  - GET  /api/clinics/:doctorId/slots?date=   -> available slots only
 *  - PATCH /api/clinics/slots/:id/status        -> 409 if booked by a different appointment
 *  - GET  /api/users/profile/:id                -> { data: { user: { role } } } or 404
 */
export const state = {
  slots: new Map(),       // slotId -> { _id, doctorId, date, startTime, endTime, status, appointmentId }
  users: new Map(),       // userId -> role
  profiles: new Map(),    // userId -> PatientProfile-like medical data (account holder)
  familyMembers: new Map(), // memberId -> { _id, accountId, fullName, relationship, isSelf, isActive, profile }
  profileWrites: [],      // [{ method, url, body }] calls that update master medical profiles
  clinicDown: false,      // simulate clinic-service unreachable
  userServiceDown: false  // simulate user-service unreachable
};

export const resetFakeServices = () => {
  state.slots.clear();
  state.users.clear();
  state.profiles.clear();
  state.familyMembers.clear();
  state.profileWrites.length = 0;
  state.clinicDown = false;
  state.userServiceDown = false;
};

let slotSeq = 0;
export const addSlot = ({ doctorId, date, startTime, endTime }) => {
  const _id = `slot-${++slotSeq}`;
  state.slots.set(_id, { _id, doctorId, date, startTime, endTime, status: 'available', appointmentId: null });
  return _id;
};

export const addFamilyMember = (accountId, { fullName, relationship = 'son', isSelf = false, isActive = true, profile = null }) => {
  const _id = new mongoose.Types.ObjectId().toString();
  state.familyMembers.set(_id, { _id, accountId, fullName, relationship, isSelf, isActive, profile });
  return _id;
};

const httpError = (status, message) => Object.assign(new Error(message), { response: { status, data: { message } } });
const networkError = () => Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });

const get = jest.fn(async (url, config = {}) => {
  let m = url.match(/\/api\/clinics\/([^/]+)\/slots$/);
  if (m) {
    if (state.clinicDown) throw networkError();
    const doctorId = m[1];
    const data = [...state.slots.values()].filter(
      (s) => s.doctorId === doctorId && s.date === config.params?.date && s.status === 'available'
    );
    return { status: 200, data: { success: true, data } };
  }
  m = url.match(/\/api\/users\/profile\/([^/]+)$/);
  if (m) {
    if (state.userServiceDown) throw networkError();
    const role = state.users.get(m[1]) || (state.profiles.has(m[1]) ? 'patient' : null);
    if (!role) throw httpError(404, 'No user account found matching that ID.');
    // Same shape as user-service getProfileById for a patient: the profile, with the account in `user`
    const profile = state.profiles.get(m[1]) || {};
    return { status: 200, data: { success: true, data: { ...profile, user: { _id: m[1], role, name: profile.name || 'Account Holder' } } } };
  }
  m = url.match(/\/api\/users\/internal\/family-members\/([^/]+)$/);
  if (m) {
    if (state.userServiceDown) throw networkError();
    if (config.headers?.['x-internal-service-secret'] !== process.env.INTERNAL_SERVICE_SECRET) throw httpError(403, 'internal only');
    const member = state.familyMembers.get(m[1]);
    if (!member) throw httpError(404, 'Family member not found.');
    return { status: 200, data: { success: true, data: member } };
  }
  throw new Error(`fake axios: unexpected GET ${url}`);
});

const patch = jest.fn(async (url, body = {}) => {
  const m = url.match(/\/api\/clinics\/slots\/([^/]+)\/status$/);
  if (m) {
    if (state.clinicDown) throw networkError();
    const slot = state.slots.get(m[1]);
    if (!slot) throw httpError(404, 'Time slot record not found.');
    if (body.status === 'booked' && slot.status === 'booked' && slot.appointmentId !== body.appointmentId) {
      throw httpError(409, 'Conflict: Slot has already been booked.');
    }
    slot.status = body.status;
    slot.appointmentId = body.appointmentId || null;
    return { status: 200, data: { success: true, data: slot } };
  }
  if (/\/api\/users\/family-member-profile\/[^/]+$/.test(url)) {
    state.profileWrites.push({ method: 'PATCH', url, body });
    return { status: 200, data: { success: true } };
  }
  throw new Error(`fake axios: unexpected PATCH ${url}`);
});

const post = jest.fn(async (url) => {
  const m = url.match(/\/api\/clinics\/releaseSlot\/([^/]+)$/);
  if (m) {
    if (state.clinicDown) throw networkError();
    const slot = state.slots.get(m[1]);
    if (slot) Object.assign(slot, { status: 'available', appointmentId: null });
    return { status: 200, data: { success: true } };
  }
  throw new Error(`fake axios: unexpected POST ${url}`);
});

const put = jest.fn(async (url, body = {}) => {
  if (/\/api\/users\/update-profile$/.test(url)) {
    state.profileWrites.push({ method: 'PUT', url, body });
    return { status: 200, data: { success: true } };
  }
  throw new Error(`fake axios: unexpected PUT ${url}`);
});

export const fakeAxios = { get, patch, post, put, delete: jest.fn() };
