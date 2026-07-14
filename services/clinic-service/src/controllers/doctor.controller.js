
import Doctor from '../models/doctor.model.js';
import mongoose from 'mongoose';
import axios from 'axios';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'https://clinic-user-service.onrender.com';

const getAllDoctors = async (req, res) => {
  try {
    const { specialization } = req.query;
    let queryFilter = { isActive: true };

    // If a patient wants to filter exclusively by a department (e.g. Dental)
    if (specialization) {
      queryFilter.specialization = { $regex: specialization, $options: 'i' }; // Case-insensitive matching
    }

    const doctors = await Doctor.find(queryFilter);

    const incomingToken = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : (req.cookies?.token || null);

    // Iterate through each doctor and fetch their accountDetails from User Service
    const doctorsWithDetails = await Promise.all(
      doctors.map(async (doctor) => {
        let userAccountDetails = null;

        // The public-doctor-account route requires no token, so we always fetch.
        // We still forward the token if present for any future auth needs.
        try {
          const requestConfig = incomingToken
            ? { headers: { Authorization: `Bearer ${incomingToken}` } }
            : {};

          const userServiceResponse = await axios.get(
            `${USER_SERVICE_URL}/api/users/public-doctor-account/${doctor._id}`,
            requestConfig
          );

          if (userServiceResponse.data && userServiceResponse.data.success) {
            const resBody = userServiceResponse.data;
            // Handles nested user details object safely
            if (resBody.data?.user) {
              userAccountDetails = resBody.data.user;
            } else if (resBody.data) {
              userAccountDetails = resBody.data;
            }
          }
        } catch (profileError) {
          console.error(
            `⚠️ Profile fetch failed for doctor ${doctor._id}: ${profileError.message}`
          );
        }

        return {
          ...doctor.toObject(),
          userId: doctor._id, // Backward compatibility
          accountDetails: userAccountDetails ? {
            fullName: userAccountDetails.name,
            email: userAccountDetails.email ? userAccountDetails.email.trim() : null,
            phoneNumber: userAccountDetails.phoneNumber,
            gender: userAccountDetails.gender,
            address: userAccountDetails.address
          } : "Account details temporarily unavailable"
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctorsWithDetails
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error retrieving doctor lists', error: error.message });
  }
};

const createDoctorProfile = async (req, res) => {
  try {
    const { userId, specialization, licenseNumber, yearsOfExperience, bio, availableDays, startTime, endTime, breakStart, breakEnd } = req.body;

    const existingDoctor = await Doctor.findById(userId);

    if (existingDoctor) {
      return res.status(400).json({ success: false, message: 'A doctor profile already exists for this user.' });
    }

    const existingLicense = await Doctor.findOne({ licenseNumber });
    if (existingLicense) {
      return res.status(400).json({ success: false, message: 'This medical license number is already registered.' });
    }
    const newDoctor = await Doctor.create({
      _id: userId,
      specialization,
      licenseNumber,
      yearsOfExperience,
      bio,
      availableDays,
      startTime,
      endTime,
      breakStart,
      breakEnd
    });
    return res.status(201).json({
      success: true,
      message: 'Doctor clinical profile established successfully.',
      data: {
        ...newDoctor.toObject(),
        userId: newDoctor._id // backward compatibility
      }
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

    // Look up the Doctor by ID directly (since _id is the User ID string)
    doctor = await Doctor.findById(id);

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
          `${USER_SERVICE_URL}/api/users/profile/${doctor._id}`,
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
        userId: doctor._id, // Keep userId field here for backward compatibility
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
    let doctor = await Doctor.findById(req.user.id);

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

const updateDoctorProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { specialization, licenseNumber, yearsOfExperience, bio, availableDays, startTime, endTime, breakStart, breakEnd } = req.body;
    let doctor = await Doctor.findById(id);
    if (!doctor || !doctor.isActive) {
      return res.status(404).json({ success: false, message: 'Doctor profile data not found.' });
    }
    if (specialization !== undefined) doctor.specialization = specialization;
    if (licenseNumber !== undefined) doctor.licenseNumber = licenseNumber;
    if (yearsOfExperience !== undefined) doctor.yearsOfExperience = yearsOfExperience;
    if (bio !== undefined) doctor.bio = bio;
    if (availableDays) doctor.availableDays = availableDays;
    if (startTime) doctor.startTime = startTime;
    if (endTime) doctor.endTime = endTime;
    if (breakStart !== undefined) doctor.breakStart = breakStart;
    if (breakEnd !== undefined) doctor.breakEnd = breakEnd;
    const updatedDoctor = await doctor.save();
    return res.status(200).json({
      success: true,
      message: 'The Doctor\'s clinical profile has been updated successfully.',
      data: updatedDoctor
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Doctor profile update tracking failed', error: error.message });
  }
}
/**
 * PATCH /admin/toggleDoctorStatus/:id
 * Admin can ACTIVATE or DEACTIVATE a doctor.
 * Syncs isActive status in BOTH the Clinic Service (Doctor table) AND User Service (User table).
 */
const toggleDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body; // true = activate, false = deactivate

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive field is required and must be a boolean (true or false).'
      });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    if (doctor.isActive === isActive) {
      return res.status(400).json({
        success: false,
        message: `Doctor is already ${isActive ? 'active' : 'deactivated'}.`
      });
    }

    // ── Step 1: Update Clinic Service Doctor profile ──────────────
    doctor.isActive = isActive;
    if (!isActive) {
      // Deactivating: stop accepting patients too
      doctor.isAcceptingPatients = false;
      // 🪝 pre-save hook fires here → cancels all future slots
    }
    await doctor.save();

    // ── Step 2: Sync to User Service (User table) ─────────────────
    const incomingToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (incomingToken) {
      try {
        await axios.patch(
          `${USER_SERVICE_URL}/api/users/admin/update-user-status/${id}`,
          { isActive },
          { headers: { Authorization: `Bearer ${incomingToken}` } }
        );
        console.log(`✅ User account for doctor ${id} set to isActive=${isActive} in user-service.`);
      } catch (userServiceError) {
        // Log but don't rollback — clinic record is already updated.
        console.error(
          `⚠️ Clinic-service updated but failed to sync with user-service for doctor ${id}: ${userServiceError.message}`
        );
      }
    }

    const action = isActive ? 'activated' : 'deactivated';
    return res.status(200).json({
      success: true,
      message: `Doctor profile ${action} successfully. User account status also updated in User Service.`,
      data: { doctorId: id, isActive }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Doctor status toggle failed.',
      error: error.message
    });
  }
};

export { getAllDoctors, createDoctorProfile, getDoctorById, doctorSelfUpdate, updateDoctorProfile, toggleDoctorStatus };
