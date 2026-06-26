
import Doctor from '../models/doctor.model.js';
import mongoose from 'mongoose';
import axios from 'axios';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

const getAllDoctors = async (req, res) => {
  try {
    const { specialization } = req.query;
    let queryFilter = { isActive: true };

    // If a patient wants to filter exclusively by a department (e.g. Dental)
    if (specialization) {
      queryFilter.specialization = { $regex: specialization, $options: 'i' }; // Case-insensitive matching
    }

    const doctors = await Doctor.find(queryFilter);

    return res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error retrieving doctor lists', error: error.message });
  }
};

const createDoctorProfile = async (req, res) => {
    try {
        const { userId, specialization, licenseNumber, yearsOfExperience, bio, availableDays, startTime, endTime, breakStart, breakEnd } = req.body;

        const existingDoctor = await Doctor.findOne({ userId });

        if (existingDoctor) {
            return res.status(400).json({ success: false, message: 'A doctor profile already exists for this user.' });
        }

        const existingLicense = await Doctor.findOne({ licenseNumber }

        );
        if(existingLicense){
            return res.status(400).json({ success: false, message: 'This medical license number is already registered.' });
        }
        const newDoctor = await Doctor.create({
            userId,
      specialization,
      licenseNumber,
      yearsOfExperience,
      bio,
      availableDays,
      startTime,
      endTime,
      breakStart,
      breakEnd
        })
    return res.status(201).json({
        success: true,
        message: 'Doctor clinical profile established successfully.',
        data: newDoctor
    });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error creating doctor profile', error: error.message });
    }
};
const getDoctorById = async (req, res) => {
  try {
    // ⚠️ CRITICAL CHECK: Make sure 'id' matches the exact word used in your router!
    // If your route is router.get('/getAllDoctors/:id', ...) use { id }.
    // If your route is router.get('/getAllDoctors/:doctorId', ...) use const { doctorId: id } = req.params;
    const { id } = req.params; 
    let doctor = null;

    if (!id) {
      return res.status(400).json({ success: false, message: 'No ID parameter provided in request.' });
    }

    // 1. Try finding by Doctor Table Primary ID (_id)
    if (mongoose.Types.ObjectId.isValid(id)) {
      doctor = await Doctor.findById(id);
    }

    // 2. Fallback: Try matching by linked userId explicitly converted to a real ObjectId
    if (!doctor && mongoose.Types.ObjectId.isValid(id)) {
      const targetObjectId = new mongoose.Types.ObjectId(id);
      doctor = await Doctor.findOne({ userId: targetObjectId });
    }

    if (!doctor) {
      return res.status(404).json({ 
        success: false, 
        message: `Doctor profile not found. Attempted search using provided ID: ${id}` 
      });
    }
    if (doctor.isActive === false) {
      return res.status(404).json({ success: false, message: 'Doctor profile is inactive.' });
    }

   // 2. 🚀 STITCH DATA: Fetch the personal account details from the User Service
    let userAccountDetails = null;
    let userServiceResponse = null;

    // Isolate the incoming token string cleanly
    const incomingToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : (req.cookies?.token || null);

    // Attempt Protected Fetch first if a token exists
    if (incomingToken) {
      try {
        userServiceResponse = await axios.get(
          `${USER_SERVICE_URL}/api/users/profile/${doctor.userId}`,
          {
            headers: {
              // Standard Header authorization for microservice inter-communication
              Authorization: `Bearer ${incomingToken}`
            }
          }
        );
        console.log("➡️ Successfully fetched profile via authenticated route!");
      } catch (profileError) {
        console.error(
          `⚠️ Authenticated user profile fetch failed: ${profileError.response?.status || 'NO_STATUS'} - ${JSON.stringify(profileError.response?.data || profileError.message)}`
        );
      }
    }



    // Process the data if one of our network calls succeeded
    if (userServiceResponse && userServiceResponse.data) {
      const resBody = userServiceResponse.data;

      // Robust mapping: Checks if data is nested under resBody.data.user OR directly under resBody.data
      if (resBody.success) {
        if (resBody.data?.user) {
          userAccountDetails = resBody.data.user;
        } else if (resBody.data) {
          userAccountDetails = resBody.data;
        }
      }
    }

    // 3. Combine both data sources into a single clean unified response
    return res.status(200).json({
      success: true,
      data: {
        // Clinical schedule details (Clinic Service DB)
        _id: doctor._id,
        userId: doctor.userId,
        specialization: doctor.specialization,
        licenseNumber: doctor.licenseNumber,
        yearsOfExperience: doctor.yearsOfExperience,
        bio: doctor.bio,
        availableDays: doctor.availableDays,
        startTime: doctor.startTime,
        endTime: doctor.endTime,
        isAcceptingPatients: doctor.isAcceptingPatients,
        
        // Personal profile details stitched dynamically from User Service DB
        accountDetails: userAccountDetails ? {
          fullName: userAccountDetails.name,
          email: userAccountDetails.email ? userAccountDetails.email.trim() : null,
          phoneNumber: userAccountDetails.phoneNumber,
          gender: userAccountDetails.gender,
          address: userAccountDetails.address
        } : "Account details temporarily unavailable"
      }
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Error retrieving doctor profile', 
      error: error.message 
    });
  }
};

const doctorSelfUpdate = async (req, res) => {
  try {
    // req.user.id comes from your corrected protect middleware (the logged-in doctor's userId string)
    let doctor = await Doctor.findOne({ userId: req.user.id });

    if (!doctor || !doctor.isActive) {
      return res.status(404).json({ success: false, message: 'Clinical profile data not found.' });
    }

    const { bio, yearsOfExperience, availableDays, startTime, endTime, breakStart, breakEnd } = req.body;

    // Apply allowed self-update properties
    if (bio !== undefined) doctor.bio = bio;
    if (yearsOfExperience !== undefined) doctor.yearsOfExperience = yearsOfExperience;
    if (availableDays) doctor.availableDays = availableDays;
    if (startTime) doctor.startTime = startTime;
    if (endTime) doctor.endTime = endTime;
    if (breakStart !== undefined) doctor.breakStart = breakStart;
    if (breakEnd !== undefined) doctor.breakEnd = breakEnd;

    const updatedDoctor = await doctor.save();

    // TODO: If schedule changes, trigger a slot re-generation window!

    return res.status(200).json({
      success: true,
      message: 'Your professional clinical profile has been updated successfully.',
      data: updatedDoctor
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Self-update tracking failed', error: error.message });
  }
};


export {getAllDoctors, createDoctorProfile, getDoctorById, doctorSelfUpdate};
