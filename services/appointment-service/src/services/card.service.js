import PatientCard from '../models/patientCard.model.js';
import axios from 'axios';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'https://clinic-user-service.onrender.com';


const generateCardNumber = async() => {
    const currentYear = new Date().getFullYear()

    const yearRegex = new RegExp(`^CLN-${currentYear}-`);

    const totalCardsThisYear = await PatientCard.countDocuments({
    cardNumber: yearRegex
  });
  const sequentialNumber = String(totalCardsThisYear + 1).padStart(5, '0');
   return `CLN-${currentYear}-${sequentialNumber}`;
};

const findCardByPatientId = async (patientId, incomingToken) => {
  // 1. Find the base card identity mapping locally
  const localCard = await PatientCard.findOne({ patientId, isActive: true });
  if (!localCard) return null;

  // 2. Fetch the true master clinical details from User Service
  try {
    const userServiceResponse = await axios.get(
      `${USER_SERVICE_URL}/api/users/profile/${patientId}`,
      {
        headers: {
          Cookie: `token=${incomingToken}`,
          Authorization: `Bearer ${incomingToken}`
        }
      }
    );

    const resBody = userServiceResponse.data;
    const userProfile = resBody?.data?.user || resBody?.user || resBody;

    // 3. Convert Mongoose document to plain object and blend the fresh details in
    const stitchedCard = localCard.toObject();
    stitchedCard.bloodType = userProfile.bloodType || localCard.bloodType;
    stitchedCard.allergies = userProfile.allergies || localCard.allergies;
    stitchedCard.chronicConditions = userProfile.chronicConditions || localCard.chronicConditions;
    stitchedCard.currentMedications = userProfile.currentMedications || localCard.currentMedications;
    stitchedCard.emergencyContactName = userProfile.emergencyContactName || localCard.emergencyContactName;
    stitchedCard.emergencyContactPhone = userProfile.emergencyContactPhone || localCard.emergencyContactPhone;
    stitchedCard.emergencyContactRelationship = userProfile.emergencyContactRelationship || localCard.emergencyContactRelationship;

    return stitchedCard;
  } catch (apiError) {
    console.error(`⚠️ Could not stitch clinical details from User Service: ${apiError.message}`);
    // If User Service is temporarily down, return local fallback copy so the system doesn't crash
    return localCard;
  }
};
const findCardByCardNumber = async (cardNumber, incomingToken) => {
  const localCard = await PatientCard.findOne({ cardNumber, isActive: true });
  if (!localCard) return null;

  try {
    const userServiceResponse = await axios.get(
      `${USER_SERVICE_URL}/api/users/profile/${localCard.patientId}`,
      {
        headers: {
          Cookie: `token=${incomingToken}`,
          Authorization: `Bearer ${incomingToken}`
        }
      }
    );

    const resBody = userServiceResponse.data;
    const userProfile = resBody?.data?.user || resBody?.user || resBody;

    const stitchedCard = localCard.toObject();
    stitchedCard.fullName = userProfile.name || userProfile.fullName;
    stitchedCard.phoneNumber = userProfile.phoneNumber;
    stitchedCard.email = userProfile.email;
    stitchedCard.bloodType = userProfile.bloodType || localCard.bloodType;
    stitchedCard.allergies = userProfile.allergies || localCard.allergies;
    stitchedCard.chronicConditions = userProfile.chronicConditions || localCard.chronicConditions;
    stitchedCard.currentMedications = userProfile.currentMedications || localCard.currentMedications;

    return stitchedCard;
  } catch (apiError) {
    console.error(`⚠️ Failed to stitch info for card lookup: ${apiError.message}`);
    return localCard; // Return fallback local data if user service is unreachable
  }
};
const updateCardBackground = async (patientId, updateData, incomingToken) => {
  try {
    const profilePayload = {
      bloodType: updateData.bloodType,
      allergies: updateData.allergies,
      chronicConditions: updateData.chronicConditions,
      currentMedications: updateData.currentMedications,
      emergencyContactName: updateData.emergencyContactName,
      emergencyContactPhone: updateData.emergencyContactPhone,
      emergencyContactRelationship: updateData.emergencyContactRelationship
    };

    // Forward the update command directly over the microservice boundary
    const userServiceResponse = await axios.put(
      `${USER_SERVICE_URL}/api/users/profile/update-profile`, 
      profilePayload,
      {
        headers: {
          Cookie: `token=${incomingToken}`,
          Authorization: `Bearer ${incomingToken}`
        }
      }
    );

    if (userServiceResponse.data && userServiceResponse.data.success) {
      console.log(`✅ Master patient profile fields synced inside User Service for ID: ${patientId}`);
      
      // Mirror the updates inside our local copy to maintain speed optimization caches
      return await PatientCard.findOneAndUpdate(
        { patientId, isActive: true },
        { $set: profilePayload },
        { new: true }
      );
    }
    return null;
  } catch (error) {
    console.error(`❌ Failed to sync profile updates to User Service: ${error.message}`);
    throw new Error(`User Service synchronization failed: ${error.message}`);
  }
};


export {generateCardNumber,updateCardBackground,findCardByPatientId,findCardByCardNumber};