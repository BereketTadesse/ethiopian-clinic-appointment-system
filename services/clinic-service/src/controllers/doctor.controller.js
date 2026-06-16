
import Doctor from '../models/doctor.model.js';
import mongoose from 'mongoose';
import axios from 'axios';

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
    const { id } = req.params;
    let doctor = null;

    // 1. Find the clinical profile record locally in the Clinic DB
    if (mongoose.Types.ObjectId.isValid(id)) {
      doctor = await Doctor.findById(id);
    }

    // If not found by doctor table primary ID, allow matching by linked userId
    if (!doctor) {
      doctor = await Doctor.findOne({ userId: id });
    }

    // Guard checks for availability
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }
    if (doctor.isActive === false) {
      return res.status(404).json({ success: false, message: 'Doctor profile is inactive.' });
    }

    // 2. 🚀 STITCH DATA: Fetch the personal account details from the User Service
    let userAccountDetails = null;
    try {
      const incomingTokenCookie = req.cookies.token;

      const userServiceResponse = await axios.get(
        `http://localhost:3001/api/users/profile/${doctor.userId}`,
        {
          headers: {
            Cookie: `token=${incomingTokenCookie}`,
            Authorization: `Bearer ${incomingTokenCookie}`
          }
        }
      );
      
      const resBody = userServiceResponse.data;

      // 🎯 EXACT NESTING MATCH: Extract user details based on your terminal log structure
      if (resBody && resBody.success && resBody.data && resBody.data.user) {
        userAccountDetails = resBody.data.user;
      }
    } catch (apiError) {
      // Safe fallback log so the endpoint still responds even if User Service experiences downtime
      console.error(`⚠️ Failed to fetch account details from User Service: ${apiError.message}`);
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