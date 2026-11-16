import PatientCard from '../models/patientCard.model.js';
import axios from 'axios';
import Counter from '../models/counter.model.js';
import { clinicYear } from '../utils/time.js';
import { userClient } from './userClient.service.js';

const USER_SERVICE_URL = (process.env.USER_SERVICE_URL || 'https://clinic-user-service.onrender.com').replace(/\/+$/, '').replace(/\/api\/users$/, '');


const pad5 = (n) => String(n).padStart(5, '0');

/**
 * Issue the next card number for the current (Addis Ababa) year: CLN-YYYY-NNNNN.
 * Race-safe: the number comes from an atomic $inc on a counter document, so two
 * first-time patients booking at the same moment always get different numbers.
 */
const generateCardNumber = async (now = new Date()) => {
  const year = clinicYear(now);
  const counterId = `card:${year}`;

  // Make sure the counter is never behind cards that already exist (cards issued
  // before this counter existed, or restored data). $max only ever raises it.
  const latest = await PatientCard.findOne({ cardNumber: new RegExp(`^CLN-${year}-\\d+$`) })
    .sort({ cardNumber: -1 })
    .select('cardNumber')
    .lean();
  const highestIssued = latest ? Number(latest.cardNumber.split('-')[2]) : 0;

  try {
    await Counter.updateOne({ _id: counterId }, { $max: { seq: highestIssued } }, { upsert: true });
  } catch (err) {
    // Two requests upserting the brand-new counter at once: one wins, the other just retries.
    if (err.code !== 11000) throw err;
    await Counter.updateOne({ _id: counterId }, { $max: { seq: highestIssued } });
  }

  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { returnDocument: 'after' }
  );
  return `CLN-${year}-${pad5(counter.seq)}`;
};

/**
 * Find the card of one PERSON — the account holder (familyMemberId null) or one of their
 * family members — or create it on that person's first booking.
 * Race-safe: the unique (patientId, familyMemberId) index lets only one card be created
 * if the same person books twice at the same moment; the other request reuses it.
 */
const findOrCreateCard = async (patientId, familyMemberId = null) => {
  const person = { patientId, familyMemberId: familyMemberId || null };
  const existing = await PatientCard.findOne({ ...person, isActive: true });
  if (existing) return existing;

  try {
    return await PatientCard.create({ ...person, cardNumber: await generateCardNumber() });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.patientId) {
      return PatientCard.findOne(person);
    }
    throw err;
  }
};

// ── Reading the master medical data from user-service ─────────────────────────

const userHeaders = (incomingToken) => ({
  ...(incomingToken ? { Authorization: `Bearer ${incomingToken}` } : {}),
  ...(process.env.INTERNAL_SERVICE_SECRET ? { 'x-internal-service-secret': process.env.INTERNAL_SERVICE_SECRET } : {})
});

const nonEmpty = (arr) => (Array.isArray(arr) && arr.length > 0 ? arr : undefined);

/**
 * Map a user-service medical profile (PatientProfile or FamilyMemberProfile shape)
 * onto the card's flat fields. Only fields the profile actually has are returned,
 * so local card values fill the gaps.
 */
const profileToCardFields = (profile) => {
  if (!profile) return {};
  const fields = {
    bloodType: profile.bloodType || undefined,
    allergies: nonEmpty(profile.allergies),
    chronicConditions: nonEmpty(profile.chronicConditions),
    currentMedications: nonEmpty(
      (profile.medications || []).map((m) => (typeof m === 'string' ? m : [m.name, m.dosage].filter(Boolean).join(' ')))
    ),
    emergencyContactName: profile.emergencyContact?.name || undefined,
    emergencyContactPhone: profile.emergencyContact?.phoneNumber || undefined,
    emergencyContactRelationship: profile.emergencyContact?.relationship || undefined
  };
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
};

/**
 * Who the card belongs to + their medical profile, from user-service.
 * Family member cards use THAT member's own profile, never the account holder's.
 */
const fetchPersonDetails = async (card, incomingToken) => {
  if (card.familyMemberId) {
    const member = await userClient.getFamilyMember(String(card.familyMemberId));
    if (!member) return null;
    return {
      identity: { fullName: member.fullName, relationship: member.relationship, phoneNumber: member.phoneNumber },
      medical: profileToCardFields(member.profile)
    };
  }

  const res = await axios.get(`${USER_SERVICE_URL}/api/users/profile/${card.patientId}`, {
    headers: userHeaders(incomingToken),
    timeout: 5000
  });
  // GET /profile/:id for a patient returns the PatientProfile in `data`, with the account in `data.user`
  const profile = res.data?.data || {};
  const account = profile.user || {};
  return {
    identity: { fullName: account.name, relationship: 'self', phoneNumber: account.phoneNumber, email: account.email },
    medical: profileToCardFields(profile)
  };
};

/** Local card + live details from user-service; falls back to the local copy if user-service is down. */
const stitchCard = async (localCard, incomingToken) => {
  try {
    const details = await fetchPersonDetails(localCard, incomingToken);
    if (!details) return localCard.toObject();
    return { ...localCard.toObject(), ...details.identity, ...details.medical };
  } catch (apiError) {
    console.error(`⚠️ Could not stitch clinical details from User Service: ${apiError.message}`);
    return localCard.toObject();
  }
};

/** The card of the account holder (familyMemberId null) or of one of their family members. */
const findCardByPatientId = async (patientId, incomingToken, familyMemberId = null) => {
  const localCard = await PatientCard.findOne({ patientId, familyMemberId: familyMemberId || null, isActive: true });
  if (!localCard) return null;
  return stitchCard(localCard, incomingToken);
};

/** All cards under one account (the holder's and each family member's). */
const findCardsForAccount = async (patientId) =>
  PatientCard.find({ patientId, isActive: true }).sort({ familyMemberId: 1, createdAt: 1 }).lean();

const findCardByCardNumber = async (cardNumber, incomingToken) => {
  const localCard = await PatientCard.findOne({ cardNumber, isActive: true });
  if (!localCard) return null;
  return stitchCard(localCard, incomingToken);
};

/**
 * Update the medical background on ONE person's card and sync it to that person's
 * master profile in user-service:
 *  - account holder -> PUT /api/users/update-profile
 *  - family member  -> PATCH (or POST if none yet) /api/users/family-member-profile/:id
 * Both use the patient's own token, so user-service enforces that they own the profile.
 */
const updateCardBackground = async (patientId, updateData, incomingToken, familyMemberId = null) => {
  const person = { patientId, familyMemberId: familyMemberId || null, isActive: true };
  const existingCard = await PatientCard.findOne(person).lean();
  if (!existingCard) return null;

  // Fields stored on the local card (flat shape). Drop anything not provided so
  // a partial update never overwrites existing values with undefined.
  const cardFields = Object.fromEntries(
    Object.entries({
      bloodType: updateData.bloodType,
      allergies: updateData.allergies,
      chronicConditions: updateData.chronicConditions,
      currentMedications: updateData.currentMedications,
      emergencyContactName: updateData.emergencyContactName,
      emergencyContactPhone: updateData.emergencyContactPhone,
      emergencyContactRelationship: updateData.emergencyContactRelationship
    }).filter(([, value]) => value !== undefined)
  );

  // Master profile shape (nested emergencyContact). Family profiles also store chronicConditions.
  const profilePayload = {};
  if (cardFields.bloodType !== undefined) profilePayload.bloodType = cardFields.bloodType;
  if (cardFields.allergies !== undefined) profilePayload.allergies = cardFields.allergies;
  if (familyMemberId && cardFields.chronicConditions !== undefined) profilePayload.chronicConditions = cardFields.chronicConditions;
  if (['emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship'].some((k) => k in cardFields)) {
    // The master profile replaces the whole emergencyContact object, so fill unchanged
    // parts from the existing card to avoid wiping them on a partial update.
    const pick = (key) => (key in cardFields ? cardFields[key] : existingCard[key]);
    profilePayload.emergencyContact = Object.fromEntries(
      Object.entries({
        name: pick('emergencyContactName'),
        phoneNumber: pick('emergencyContactPhone'),
        relationship: pick('emergencyContactRelationship')
      }).filter(([, value]) => value !== undefined && value !== null)
    );
  }

  const headers = { Authorization: `Bearer ${incomingToken}` };
  try {
    if (Object.keys(profilePayload).length > 0) {
      if (familyMemberId) {
        const url = `${USER_SERVICE_URL}/api/users/family-member-profile/${familyMemberId}`;
        try {
          await axios.patch(url, profilePayload, { headers, timeout: 5000 });
        } catch (err) {
          if (err.response?.status !== 404) throw err;
          await axios.post(url, profilePayload, { headers, timeout: 5000 }); // first medical profile for this member
        }
      } else {
        await axios.put(`${USER_SERVICE_URL}/api/users/update-profile`, profilePayload, { headers, timeout: 5000 });
      }
    }
  } catch (error) {
    console.error(`❌ Failed to sync profile updates to User Service: ${error.response?.data?.message || error.message}`);
    throw new Error(`User Service synchronization failed: ${error.response?.data?.message || error.message}`);
  }

  // Mirror the updates on the local card
  return PatientCard.findOneAndUpdate(person, { $set: cardFields }, { returnDocument: 'after' });
};

export {
  generateCardNumber,
  findOrCreateCard,
  updateCardBackground,
  findCardByPatientId,
  findCardsForAccount,
  findCardByCardNumber
};
