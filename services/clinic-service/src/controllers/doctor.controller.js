
import Doctor from '../models/doctor.model.js';
import Slot from '../models/slot.model.js';
import mongoose from 'mongoose';
import axios from 'axios';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const USER_SERVICE_TIMEOUT_MS = Number(process.env.USER_SERVICE_TIMEOUT_MS) || 5000;
const USER_SERVICE_SYNC_ATTEMPTS = Math.max(
  1,
  Number(process.env.USER_SERVICE_SYNC_ATTEMPTS) || 3
);
const USER_SERVICE_RETRY_BASE_DELAY_MS = Number(process.env.USER_SERVICE_RETRY_BASE_DELAY_MS) || 250;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const isRetryableUserServiceError = (error) => {
  const status = error.response?.status;

  return (
    !error.response ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
};

const syncDoctorUserStatus = async ({ doctorId, isActive, token }) => {
  let lastError;

  for (let attempt = 1; attempt <= USER_SERVICE_SYNC_ATTEMPTS; attempt += 1) {
    try {
      return await axios.patch(
        `${USER_SERVICE_URL}/api/users/admin/update-user-status/${doctorId}`,
        { isActive },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: USER_SERVICE_TIMEOUT_MS
        }
      );
    } catch (error) {
      lastError = error;
      const shouldRetry =
        attempt < USER_SERVICE_SYNC_ATTEMPTS && isRetryableUserServiceError(error);

      if (!shouldRetry) {
        throw error;
      }

      const delay = USER_SERVICE_RETRY_BASE_DELAY_MS * (2 ** (attempt - 1));
      console.warn(
        `User-service status sync attempt ${attempt}/${USER_SERVICE_SYNC_ATTEMPTS} failed for doctor ${doctorId}; retrying in ${delay}ms.`
      );
      await wait(delay);
    }
  }

  throw lastError;
};

const getAllDoctors = async (req, res) => {
  try {
    const { specialization, all, includeInactive } = req.query;
    let queryFilter = {};

    if (all !== 'true' && includeInactive !== 'true') {
      queryFilter.isActive = true;
    }

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

    const clinicStatusChanged = doctor.isActive !== isActive;

    const incomingToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (!incomingToken) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token is required to update the linked user account.'
      });
    }

    // Sync the User Service first so a downstream failure leaves the clinic record unchanged.
    if (incomingToken) {
      try {
        await syncDoctorUserStatus({ doctorId: id, isActive, token: incomingToken });
        console.log(`✅ User account for doctor ${id} set to isActive=${isActive} in user-service.`);
      } catch (userServiceError) {
        console.error(
          `User-service status sync failed for doctor ${id} after ${USER_SERVICE_SYNC_ATTEMPTS} attempt(s): ${userServiceError.message}`
        );

        return res.status(userServiceError.response?.status || 502).json({
          success: false,
          message: 'The linked user account could not be updated. The clinic profile was left unchanged.',
          error: userServiceError.response?.data?.message || userServiceError.message
        });
      }
    }

    // Apply the local change only after the linked user account has synchronized.
    if (clinicStatusChanged) {
      doctor.isActive = isActive;
      doctor.isAcceptingPatients = isActive;
      // When deactivating, the pre-save hook cancels all future slots.
      await doctor.save();
    }

    const action = clinicStatusChanged
      ? (isActive ? 'activated' : 'deactivated')
      : 'synchronized';
    return res.status(200).json({
      success: true,
      message: `Doctor profile ${action} successfully. User account status also updated in User Service.`,
      data: { doctorId: id, isActive, clinicStatusChanged }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Doctor status toggle failed.',
      error: error.message
    });
  }
};

// 🏖️ DOCTOR ROLE ONLY: Request a leave period (Starts in 'pending' status for admin review)
const requestDoctorLeave = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { startDate, endDate, reason } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate (YYYY-MM-DD) are required.'
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD (e.g. 2026-10-20).'
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be after endDate.'
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    doctor.leaves = doctor.leaves || [];
    const newLeave = {
      startDate,
      endDate,
      reason: reason || 'Personal / Medical Leave',
      status: 'pending', // Starts pending until an admin approves it
      createdAt: new Date()
    };

    doctor.leaves.push(newLeave);
    await doctor.save();

    console.log(`📝 [Leave Request] Doctor ${doctorId} submitted leave request for ${startDate} to ${endDate} (Pending Admin Review).`);

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully. It is now pending administrator approval.',
      data: doctor.leaves[doctor.leaves.length - 1]
    });
  } catch (error) {
    console.error('Error submitting doctor leave request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit leave request',
      error: error.message
    });
  }
};

// 🏖️ DOCTOR ROLE ONLY: Get own leave requests and statuses
const getMyLeaves = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const doctor = await Doctor.findById(doctorId).select('leaves');
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    return res.status(200).json({
      success: true,
      count: doctor.leaves?.length || 0,
      data: doctor.leaves || []
    });
  } catch (error) {
    console.error('Error fetching doctor self leaves:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve leaves',
      error: error.message
    });
  }
};

// 👑 ADMIN ONLY: View all leave requests across all doctors
const getAllDoctorLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query; // optional filter: 'pending', 'approved', 'rejected'

    const doctors = await Doctor.find({ 'leaves.0': { $exists: true } });

    const allRequests = [];
    doctors.forEach((doc) => {
      doc.leaves.forEach((l) => {
        if (!status || l.status === status) {
          allRequests.push({
            doctorId: doc._id,
            specialization: doc.specialization,
            licenseNumber: doc.licenseNumber,
            leaveId: l._id,
            startDate: l.startDate,
            endDate: l.endDate,
            reason: l.reason,
            status: l.status,
            adminNotes: l.adminNotes,
            reviewedBy: l.reviewedBy,
            reviewedAt: l.reviewedAt,
            createdAt: l.createdAt
          });
        }
      });
    });

    // Sort newest request first
    allRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      count: allRequests.length,
      data: allRequests
    });
  } catch (error) {
    console.error('Error fetching all doctor leave requests for admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor leave requests',
      error: error.message
    });
  }
};

// 👑 ADMIN ONLY: Approve or Reject a doctor's leave request
const reviewDoctorLeaveRequest = async (req, res) => {
  try {
    const { doctorId, leaveId } = req.params;
    const { status, adminNotes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be either "approved" or "rejected".'
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    const leave = doctor.leaves.id(leaveId);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    leave.status = status;
    leave.adminNotes = adminNotes || (status === 'approved' ? 'Approved by administrator' : 'Rejected by administrator');
    leave.reviewedBy = req.user.id;
    leave.reviewedAt = new Date();

    let slotRemovalCount = 0;
    let bookedNotice = '';

    if (status === 'approved') {
      // 🧹 CASCADE: Automatically purge unbooked slots during approved leave period!
      const removalResult = await Slot.deleteMany({
        doctorId,
        date: { $gte: leave.startDate, $lte: leave.endDate },
        status: 'available'
      });
      slotRemovalCount = removalResult.deletedCount;

      const bookedCount = await Slot.countDocuments({
        doctorId,
        date: { $gte: leave.startDate, $lte: leave.endDate },
        status: 'booked'
      });

      bookedNotice = bookedCount > 0
        ? `⚠️ Notice: ${bookedCount} patient appointment(s) were already booked during this leave period and need rescheduling.`
        : 'Zero conflicting appointments were booked during this period.';

      console.log(`✅ [Leave Approved] Admin approved leave for Doctor ${doctorId} (${leave.startDate} to ${leave.endDate}). Removed ${slotRemovalCount} unbooked slot(s).`);
    } else {
      console.log(`❌ [Leave Rejected] Admin rejected leave for Doctor ${doctorId} (${leave.startDate} to ${leave.endDate}). Reason: ${leave.adminNotes}`);
    }

    await doctor.save();

    return res.status(200).json({
      success: true,
      message: `Leave request for Doctor ${doctorId} has been ${status}.`,
      data: {
        leave,
        unbookedSlotsRemoved: slotRemovalCount,
        bookedAppointmentsNotice: bookedNotice
      }
    });
  } catch (error) {
    console.error('Error reviewing doctor leave request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to review leave request',
      error: error.message
    });
  }
};

const addDoctorLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, reason } = req.body;

    // Authorization: Only admin or the doctor themselves can submit leave
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You do not have permission to manage leaves for this doctor.'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate (YYYY-MM-DD) are required.'
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD (e.g. 2026-10-20).'
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be after endDate.'
      });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    const leaveStatus = req.user.role === 'admin' ? 'approved' : 'pending';

    doctor.leaves = doctor.leaves || [];
    const newLeave = {
      startDate,
      endDate,
      reason: reason || 'Scheduled Leave / Absence',
      status: leaveStatus,
      createdAt: new Date()
    };

    doctor.leaves.push(newLeave);
    await doctor.save();

    let slotRemovalCount = 0;
    let bookedNotice = '';

    if (leaveStatus === 'approved') {
      const slotRemovalResult = await Slot.deleteMany({
        doctorId: id,
        date: { $gte: startDate, $lte: endDate },
        status: 'available'
      });
      slotRemovalCount = slotRemovalResult.deletedCount;

      const bookedCount = await Slot.countDocuments({
        doctorId: id,
        date: { $gte: startDate, $lte: endDate },
        status: 'booked'
      });

      bookedNotice = bookedCount > 0
        ? `⚠️ Warning: ${bookedCount} patient appointment(s) are already booked during this leave period and need rescheduling.`
        : 'Zero conflicting appointments were booked during this period.';
    }

    return res.status(201).json({
      success: true,
      message: leaveStatus === 'approved' 
        ? `Leave successfully recorded and approved from ${startDate} to ${endDate}.`
        : `Leave request submitted and pending administrator approval.`,
      data: {
        leave: doctor.leaves[doctor.leaves.length - 1],
        unbookedSlotsRemoved: slotRemovalCount,
        existingBookedAppointmentsNotice: bookedNotice
      }
    });
  } catch (error) {
    console.error('Error adding doctor leave:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record doctor leave',
      error: error.message
    });
  }
};

const getDoctorLeaves = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findById(id).select('leaves');
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    return res.status(200).json({
      success: true,
      count: doctor.leaves?.length || 0,
      data: doctor.leaves || []
    });
  } catch (error) {
    console.error('Error fetching doctor leaves:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor leaves',
      error: error.message
    });
  }
};

const deleteDoctorLeave = async (req, res) => {
  try {
    const { id, leaveId } = req.params;

    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You do not have permission to modify this doctor profile.'
      });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    const initialLength = doctor.leaves.length;
    doctor.leaves = doctor.leaves.filter(l => l._id.toString() !== leaveId);

    if (doctor.leaves.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Leave record not found.' });
    }

    await doctor.save();

    return res.status(200).json({
      success: true,
      message: 'Leave period cancelled and removed successfully.',
      data: doctor.leaves
    });
  } catch (error) {
    console.error('Error deleting doctor leave:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove doctor leave',
      error: error.message
    });
  }
};

export { 
  getAllDoctors, 
  createDoctorProfile, 
  getDoctorById, 
  doctorSelfUpdate, 
  updateDoctorProfile, 
  toggleDoctorStatus,
  requestDoctorLeave,
  getMyLeaves,
  getAllDoctorLeaveRequests,
  reviewDoctorLeaveRequest,
  addDoctorLeave,
  getDoctorLeaves,
  deleteDoctorLeave
};
