import User from '../models/user-service.model.js';
import axios from 'axios';
import PatientProfile from '../models/PatientProfile.js';
import bcrypt from 'bcryptjs';

const CLINIC_SERVICE_URL = process.env.CLINIC_SERVICE_URL || 'http://localhost:3002';
import sendVerificationEmail from '../utils/send-email.js';
import { getCookieOptions } from '../utils/cookieConfig.js';
import redisClient from '../config/redis.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {v2 as cloudinary} from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const createUser = async (req, res) => {
    try {
        const {name,email,phoneNumber,address,password,role,gender} = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        if (!name || !email || !phoneNumber || !address || !password|| !gender) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        // Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const verificationToken = crypto.randomBytes(32).toString('hex');

        const verificationUrl = `http://localhost:3001/api/users/verify/${verificationToken}`;

    // 2. Build the HTML template string right here inside your controller!
    const subject = "Verify Your Clinic Account Address";

    const htmlTemplate = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #2b6cb0;">Welcome to the Clinic System, ${name}!</h1>
        <p style="color: #4a5568; font-size: 16px;">Thank you for signing up. Please click the button below to activate your user account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #2b6cb0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Activate Account</a>
        </div>
        <p style="color: #718096; font-size: 12px;">If you didn't request this action, please safely disregard this email statement.</p>
      </div>
    `;

        const user = new User({ name, email, phoneNumber, address, password: hashedPassword, role ,verificationToken,gender});
        await user.save();
        sendVerificationEmail(email, subject, htmlTemplate);
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        // Catch-all for database errors or unexpected crashes
        console.error(`❌ Error in registerUser controller: ${error.message}`);
         
        return res.status(500).json({ 
         success: false, 
         message: 'Server Error, please try again later' 
            });    
    }
}

const verifyEmail = async (req, res) => {
  try {
    // 1. Extract the token out of the incoming URL path parameter
    const { token } = req.params;

    // 2. Search your MongoDB Atlas database for a user matching this token string
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // 3. Flip their access switches and clear out the token field
    user.isVerified = true;
    user.verificationToken = undefined; // Clears the token out of the database so it can't be reused!
    await user.save();

    // 4. Send back a clean visual confirmation response
    // In a full application, you would use res.redirect('http://yourfrontend.com/verified') 
    // to bring them back to your website landing page!
    return res.status(200).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #28a745;">✓ Account Successfully Verified!</h1>
        <p>Thank you, ${user.name}. Your identity is confirmed. You can now log into the application.</p>
      </div>
    `);

  } catch (error) {
    console.error(`❌ Error in verifyEmail: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if(!user){
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Check if the password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isverified = user.isVerified;
        if (!isverified) {
            return res.status(403).json({ message: 'Please verify your email before logging in' });
        }

        // Generate a unique token ID so this JWT can be blacklisted or audited later
        const tokenJti = crypto.randomUUID();
        const token = jwt.sign(
          { userId: user._id, jti: tokenJti, role: user.role }, 
          process.env.JWT_SECRET, 
          { expiresIn: process.env.JWT_EXPIRE }
        );
        const cookieOptions = getCookieOptions();

        // If we get here, the user is authenticated
        return res.status(200)
          .cookie('token', token, cookieOptions)
          .json({ message: 'Login successful', user, token, jti: tokenJti });
    } catch (error) {
        console.error(`❌ Error in loginUser: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }}

const logoutUser = async (req, res) => {
  try {
    // 1. Grab the raw token string out of the incoming cookies
    const token = req.cookies.token;

    if (token) {
      try {
        // 2. Decode the token to inspect the expiration data and jti identity claim
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.jti) {
          const nowInSeconds = Math.floor(Date.now() / 1000);
          // Calculate remaining seconds until the token expires naturally
          const remainingSeconds = decoded.exp - nowInSeconds;

          // 3. 🎯 LOCK IN REDIS: If the token is still alive, blacklist it!
          if (remainingSeconds > 0) {
            await redisClient.set(
              `blacklist:${decoded.jti}`, 
              '1', 
              { EX: remainingSeconds } // EX means expire automatically in X seconds!
            );
          }
        }
      } catch (jwtError) {
        // If the token is already structurally corrupted or expired, skip blacklisting it
        console.log("Token decode skipped during logout execution");
      }
    }

    // 4. Wipe out the cookie session from the client's web browser storage
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Logged out cleanly. Session token blacklisted safely.' 
    });

  } catch (error) {
    console.error(`❌ Cache Blacklisting Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
    await user.save();
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? `https://your-clinic-frontend.vercel.app/reset-password/${resetToken}`
      : `http://localhost:3000/reset-password/${resetToken}`;

    // 6. Build the email template right here in the controller
    const subject = "Reset Your Account Password";
    const htmlTemplate = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #e53e3e;">Password Reset Request</h2>
        <p style="color: #4a5568;">We received a request to change your account password. Click the button below to choose a new one:</p>
        <p style="color: #e53e3e; font-weight: bold;">This reset link will completely expire in 10 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}" style="background-color: #e53e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #718096; font-size: 12px;">If you didn't request this, please ignore this email and your password will stay the same.</p>
      </div>
    `;

    // 7. Fire the email using your generic Brevo helper!
    sendVerificationEmail(user.email, subject, htmlTemplate);

    return res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email address.'
    });

  } catch (error) {
    console.error(`❌ Error in forgotPassword: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
}
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if(!password) {
      return res.status(400).json({message: 'Password is required'});
    }
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if(!user){
      return res.status(400).json({message: 'Invalid or expired password reset token'});
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (error) {
    console.error(`❌ Reset Password Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
  }

  const changePassword = async (req, res) => {
    try {

      const {currentPassword, newPassword} = req.body;

      if(!currentPassword || !newPassword){
        return res.status(400).json({message: 'Current and new password are required'});
      }

      const user = await User.findById(req.user.id).select('+password');
      if(!user){
        return res.status(404).json({message: 'User not found'});
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if(!isMatch){
        return res.status(400).json({message: 'Current password is incorrect'});
      }
      const samePassword = await bcrypt.compare(newPassword, user.password);
      if(samePassword){
        return res.status(400).json({message: 'New password cannot be the same as the old one'});
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();
      return res.status(200).json({message: 'Password changed successfully'});
    } catch (error) {
      console.error(`❌ Change Password Controller Error: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  const uploadProfile= async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      let profilePictureURL

      if(req.file) {
        // Convert the memory buffer of the image into a format Cloudinary understands
        const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
        const uploadResponse = await cloudinary.uploader.upload(base64File, {
          folder: 'ethio_clinic_avatars', // Saves avatars to a dedicated folder
          resource_type: 'image'
        });
      
        profilePictureURL = uploadResponse.secure_url;
      }

      const extraDetails = { ...req.body };
      
      // Update core User details if provided in onboarding
      const coreUpdates = {};
      if (profilePictureURL) coreUpdates.profilePicture = profilePictureURL;
      if (extraDetails.address) coreUpdates.address = extraDetails.address;
      if (extraDetails.gender) coreUpdates.gender = extraDetails.gender;
      if (extraDetails.birthDate) coreUpdates.birthDate = extraDetails.birthDate;

      if (Object.keys(coreUpdates).length > 0) {
        await User.findByIdAndUpdate(userId, { $set: coreUpdates }, { new: true });
      }
    
      let detailedProfile;

      if (userRole === 'patient') {
        // fields expected here from user input: address, birthDate, gender, emergencyContact
        detailedProfile = await PatientProfile.findOneAndUpdate(
          { user: userId },
          { $set: extraDetails },
          { new: true, upsert: true } // upsert creates the document if this is their first time onboarding!
        ).populate('user', 'name email phoneNumber role profilePicture');

      } else if (userRole === 'doctor') {
        // For doctors, core onboarding details are saved on User model.
        // Clinical details are managed directly in clinic-service.
        detailedProfile = await User.findById(userId).select('-password');
      } else {
        return res.status(400).json({ success: false, message: 'Invalid role assignment for onboarding.' });
      }

      // 3. PHASE 3: Send back the unified payload response
      return res.status(200).json({
        success: true,
        message: 'Onboarding profile data and picture saved successfully!',
        data: detailedProfile
      });

    } catch (error) {
      console.error(`❌ Unified Onboarding Error: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };

  const updateProfile = async (req, res) => {
    try {
      const userId = req.user.id || req.user._id; 

      // 1. Fetch the user from MongoDB Atlas to safely determine their role flag
      const fullUser = await User.findById(userId);
      if (!fullUser) {
        return res.status(404).json({ success: false, message: 'User account not found.' });
      }
      const userRole = fullUser.role;

      // =========================================================
      // PHASE 1: SPLIT & UPDATE COMMON USER ROW (REGISTRATION DATA)
      // =========================================================
      const coreUpdateFields = {};

      // Catch core registration strings if the user edited them
      if (req.body.name) coreUpdateFields.name = req.body.name;
      if (req.body.email) coreUpdateFields.email = req.body.email;
      if (req.body.phoneNumber) coreUpdateFields.phoneNumber = req.body.phoneNumber;
      if (req.body.address) coreUpdateFields.address = req.body.address;
      if (req.body.gender) coreUpdateFields.gender = req.body.gender;

      // Handle profile picture binary file upload via Cloudinary stream pipeline
      if (req.file) {
        const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const uploadResponse = await cloudinary.uploader.upload(base64File, {
          folder: 'ethio_clinic_avatars',
          resource_type: 'image'
        });
        coreUpdateFields.profilePicture = uploadResponse.secure_url;
      }

      // Save changes to the core identity registry table if any changes were requested
      if (Object.keys(coreUpdateFields).length > 0) {
        await User.findByIdAndUpdate(userId, { $set: coreUpdateFields }, { new: true });
      }

      // =========================================================
      // PHASE 2: SPLIT & UPDATE CUSTOM PROFILE ROW (CLINICAL DATA)
      // =========================================================
      // Clone body payload, but strip out registration items so they don't corrupt profile tables
      const extraProfileDetails = { ...req.body };
      delete extraProfileDetails.name;
      delete extraProfileDetails.email;
      delete extraProfileDetails.phoneNumber;
      delete extraProfileDetails.address;
      delete extraProfileDetails.gender;

      let detailedProfile;

      // Route remaining specialized data fields into correct collection rows based on role
      if (userRole === 'patient') {
        detailedProfile = await PatientProfile.findOneAndUpdate(
          { user: userId },
          { $set: extraProfileDetails },
          { new: true, upsert: true } // upsert: true builds the row if it doesn't exist yet!
        ).populate('user', 'name email phoneNumber role profilePicture');

      } else if (userRole === 'doctor') {
        // Forward clinical details to Clinic Service if the doctor updated any clinical attributes
        const incomingToken = req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.split(' ')[1]
          : (req.cookies?.token || null);

        if (incomingToken && Object.keys(extraProfileDetails).length > 0) {
          try {
            await axios.patch(
              `${CLINIC_SERVICE_URL}/api/clinics/me`,
              extraProfileDetails,
              {
                headers: {
                  Authorization: `Bearer ${incomingToken}`
                }
              }
            );
          } catch (clinicErr) {
            console.error(`⚠️ Failed to forward doctor clinical updates to clinic-service: ${clinicErr.message}`);
          }
        }
        
        detailedProfile = await User.findById(userId).select('-password');
      } else {
        return res.status(400).json({ success: false, message: 'Invalid role structural setup for profiles.' });
      }

      // =========================================================
      // PHASE 3: UNIFIED CLIENT PAYLOAD DELIVERY
      // =========================================================
      return res.status(200).json({
        success: true,
        message: 'Core registration parameters and clinical profile attributes updated concurrently!',
        data: detailedProfile
      });

    } catch (error) {
      console.error(`❌ Complete Synchronized Update Error: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };

const getProfileById = async (req, res) => {
  try {
    const targetUserId = req.params.id;

    // 1. Find the core user row first to find out what their role is
    // 🔒 select('-password') guarantees the hashed password never leaks into the network response
    const coreUser = await User.findById(targetUserId).select('-password');
    
    if (!coreUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'No user account found matching that ID.' 
      });
    }

    const userRole = coreUser.role;
    let combinedProfileData;

    // 2. Fetch specialized data from the matching collection based on their role flag
    if (userRole === 'patient') {
      combinedProfileData = await PatientProfile.findOne({ user: targetUserId })
        .populate('user', 'name email phoneNumber role profilePicture createdAt');

      // Safe Fallback: If they haven't filled out profile forms yet, return an empty layout object wrapper
      if (!combinedProfileData) {
        combinedProfileData = { 
          user: coreUser, 
          address: "", 
          birthDate: null, 
          gender: "", 
          emergencyContact: {} 
        };
      }

    } else if (userRole === 'doctor') {
      let clinicDetails = null;
      try {
        const clinicServiceResponse = await axios.get(
          `${CLINIC_SERVICE_URL}/api/clinics/getAllDoctors/${targetUserId}`
        );
        if (clinicServiceResponse.data && clinicServiceResponse.data.success) {
          clinicDetails = clinicServiceResponse.data.data;
        }
      } catch (err) {
        console.error(`⚠️ Failed to fetch doctor clinical details: ${err.message}`);
      }

      combinedProfileData = {
        user: coreUser,
        specialization: clinicDetails?.specialization || "",
        licenseNumber: clinicDetails?.licenseNumber || "",
        yearsOfExperience: clinicDetails?.yearsOfExperience || clinicDetails?.experience || 0,
        bio: clinicDetails?.bio || "",
        availableDays: clinicDetails?.availableDays || [],
        startTime: clinicDetails?.startTime || "",
        endTime: clinicDetails?.endTime || "",
        breakStart: clinicDetails?.breakStart || null,
        breakEnd: clinicDetails?.breakEnd || null,
        isAcceptingPatients: clinicDetails?.isAcceptingPatients ?? true,
        isActive: clinicDetails?.isActive ?? true
      };
    } else {
      // Fallback for Admin accounts who only have the common User details
      return res.status(200).json({ success: true, data: { user: coreUser } });
    }

    // 3. Return the fully populated profile record back to the frontend
    return res.status(200).json({
      success: true,
      data: combinedProfileData
    });

  } catch (error) {
    // Catch invalid MongoDB ObjectIDs cast errors safely
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid User ID format sent to server.' });
    }
    console.error(`❌ Fetch Profile By ID Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const getPublicDoctorAccountById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email phoneNumber gender address profilePicture role isActive');

    if (!user || user.isActive === false || user.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Public doctor account details not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          gender: user.gender,
          address: user.address,
          profilePicture: user.profilePicture
        }
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid User ID format sent to server.' });
    }

    console.error(`Public Doctor Account Fetch Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const requestEmailUpdate =  async(req,res) => {
  try {
    const {newEmail , currentpassword} = req.body;
    const userId = req.user.id

    if (!newEmail || !currentpassword)
    {
      return res.status(400).json({success: false, message: 'Please provide the new email and your current password.'});
    }

    const user = await User.findById(userId).select('+password')

    if(!user) {
      return res.status(400).json({ success: false , message: 'the user doesnt exist'
      })
    }

    const isMatch = await bcrypt.compare(currentpassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }
    // 3. Check if the new email is already taken by another account
    const emailExists = await User.findOne({ email: newEmail });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'This email address is already registered to another account.' });
    }
    // 4. Generate a secure temporary token
    const rawUpdateToken = crypto.randomBytes(20).toString('hex');
   
    
    // 5. 🎯 FIX: Correctly define standalone variables for your MongoDB update query
    const hashedToken = crypto.createHash('sha256').update(rawUpdateToken).digest('hex');
    const tokenExpiry = Date.now() + 30 * 60 * 1000; // Expires in 30 minutes

    // 6. 🎯 FIX: Safely update the document directly in Atlas bypassing validation cascading
    await User.findByIdAndUpdate(userId, {
      $set: {
        emailUpdateToken: hashedToken,
        pendingEmail: newEmail,
        emailUpdateExpire: tokenExpiry
      }
    });

    // 6. Build the confirmation link pointing to your Vercel frontend layout
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? `https://your-clinic-frontend.vercel.app/verify-email-update/${rawUpdateToken}`
      : `http://localhost:3000/verify-email-update/${rawUpdateToken}`;

    // 7. Send the email notification via your Brevo helper
    const subject = "Confirm Your New Email Address";
    const htmlTemplate = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #3182ce;">Email Change Request</h2>
        <p style="color: #4a5568;">You requested to update your account email to: <strong>${newEmail}</strong>.</p>
        <p style="color: #e53e3e; font-weight: bold;">Please click the button below to verify this new address and finalize the change:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}" style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Confirm New Email</a>
        </div>
        <p style="color: #718096; font-size: 12px;">This link will expire in 30 minutes. If you did not make this request, you can safely ignore this email.</p>
      </div>
    `;

    await sendVerificationEmail(newEmail, subject, htmlTemplate);

    return res.status(200).json({
      success: true,
      message: 'Verification link sent to your new email inbox. Please confirm it to complete the update.'
    });

  } catch (error) {
    console.error(`❌ Request Email Update Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
const confirmEmailUpdate = async (req, res) => {
  try {
    const { token } = req.params;

    // 1. Re-hash the incoming raw token from the URL parameters to match what is inside MongoDB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Query for the user holding this token whose expiry date is still valid
    const user = await User.findOne({
      emailUpdateToken: hashedToken,
      emailUpdateExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired email update token.'
      });
    }

    // 3. Double check that the pending email wasn't taken while waiting for verification
    const emailExists = await User.findOne({ email: user.pendingEmail });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'This new email address has already been claimed by another account.' });
    }

// 4. 🎯 FIX: Perform the swap and clear the temporary fields directly in Atlas
    // This completely bypasses the strict schema validation cascading rules!
    await User.findByIdAndUpdate(user._id, {
      $set: {
        email: user.pendingEmail // Move the verified pending email to the primary email field
      },
      $unset: {
        pendingEmail: 1,       // $unset completely removes these temporary keys 
        emailUpdateToken: 1,   // from the document so your database stays clean
        emailUpdateExpire: 1
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Your email address has been updated successfully! You can now log in using your new email.'
    });

  } catch (error) {
    console.error(`❌ Confirm Email Update Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
const deleteMe = async(req, res)=>{
  try{
    const {password} = req.body
    const userId = req.user.id

    if(!password){
        return res.status(400).json({message: 'Please provide your current password to confirm account deletion.'});
    }
    const user = await User.findById(userId).select('+password')

    if(!user){
      return res.status(400).json({message: 'User account not found.'})
    }
    const isMatch = await bcrypt.compare(password, user.password);

    if(!isMatch){
      return res.status(401).json({ success: false, message: 'Incorrect password credentials. Deletion unauthorized.' });
    };
    const userRole = user.role;
    if(userRole ==='patient'){
      await PatientProfile.findOneAndDelete({ user: userId });
    } 
    else if (userRole === 'doctor') {
      // Forge a short-lived admin token to authorize the cross-service call
      const internalAdminToken = jwt.sign(
        { id: userId, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1m' }
      );

      try {
        await axios.delete(
          `${CLINIC_SERVICE_URL}/api/clinics/admin/disableDoctorProfile/${userId}`,
          { headers: { Authorization: `Bearer ${internalAdminToken}` } }
        );
        console.log(`✅ Doctor clinical profile deactivated in clinic-service for user ${userId}`);
      } catch (err) {
        console.error(`⚠️ Failed to deactivate doctor profile in clinic-service: ${err.message}`);
      }
    }
    await User.findByIdAndDelete(userId);
    // 5. 🧼 SESSION CLEAN-UP: Clear the HTTP-only JWT authentication cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // Destroys cookie data within 10 seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    return res.status(200).json({ success: true, message: 'Your account and all associated data have been permanently deleted. We\'re sorry to see you go!' });
    }
    catch (error) {
    console.error(`❌ Account Elimination Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
const getUsers = async (req, res) => {
  try {
    // 1. Extract and sanitize Pagination Parameters (Provide fallback defaults)
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // 2. Build the Dynamic Filtering Object
    const filterQuery = {};

    // Filter by Role (e.g., ?role=doctor or ?role=patient)
    if (req.query.role) {
      filterQuery.role = req.query.role;
    }

    // Filter by City (Using a case-insensitive regex match for flexible search typing)
    if (req.query.city) {
      filterQuery.city = { $regex: req.query.city, $options: 'i' };
    }

    // Filter by Email Verification Flag (?isVerified=true)
    if (req.query.isVerified) {
      filterQuery.isVerified = req.query.isVerified === 'true';
    }

    // Filter by System Activity Flag (?isActive=true)
    if (req.query.isActive) {
      filterQuery.isActive = req.query.isActive === 'true';
    }

    // 3. Concurrently execute the database queries to drastically optimize performance
    const [users, totalCount] = await Promise.all([
      User.find(filterQuery)
        .select('-password') // 🔒 Always strip out private parameters
        .sort({ createdAt: -1 }) // Sort by newest records first
        .skip(skip)
        .limit(limit),
      User.countDocuments(filterQuery) // Gets total matching criteria count for frontend calculations
    ]);

    // 4. Build structural response payload containing metadata context indicators
    return res.status(200).json({
      success: true,
      count: users.length,
      totalCount, // 🎯 CRITICAL Requirement: Absolute historical tally matches criteria
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limit
      },
      data: users
    });

  } catch (error) {
    console.error(`❌ Paginated Listing Directory Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const adminUpdateUserStatus = async(req,res) => {
  try{
    const {id} = req.params;
    const {role, isActive} = req.body;

    const updateFields = []

    if (role !== undefined) updateFields.role = role;
    if (isActive !== undefined) updateFields.isActive = isActive;

    // 2. If the admin sent an empty request body, reject early
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide at least one field to update (role, isActive, or isVerified).' 
      });
    }
    // 3. Update the user record directly in MongoDB Atlas
    // { new: true, runValidators: true } ensures we get the updated document back and validate fields like role enums
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Target user record not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `User security settings updated successfully.`,
      data: updatedUser
    });
    }
  catch(error){
    console.error(`❌ Admin Status Modification Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
const createFamilyMember = async (req, res) => {
  try {
    const { fullName, dateOfBirth, gender, relationship, phoneNumber, nationalId } = req.body;

    const member = new FamilyMember({
      accountId: req.user._id,
      fullName,
      dateOfBirth,
      gender,
      relationship,
      phoneNumber,
      nationalId,
      isSelf: false
    });

    await member.save();
    res.status(201).json({ member });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateFamilyMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    // ✅ Only pick fields that were actually sent in the request
    const allowedFields = ['fullName', 'dateOfBirth', 'gender', 'relationship', 'phoneNumber', 'nationalId'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const member = await FamilyMember.findOneAndUpdate(
      { _id: memberId, accountId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    res.status(200).json({ member });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /family-members
const getAllFamilyMembers = async (req, res) => {
  try {
    const members = await FamilyMember.find({ accountId: req.user._id });

    res.status(200).json({ count: members.length, members });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /family-members/:memberId
const getOneFamilyMember = async (req, res) => {
  try {
    const member = await FamilyMember.findOne({
      _id: req.params.memberId,
      accountId: req.user._id   // ensures it belongs to this user
    });

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    res.status(200).json({ member });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteFamilyMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await FamilyMember.findOneAndUpdate({
      _id: memberId,
      accountId: req.user._id
    }, { $set: { isActive: false } });

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    res.status(200).json({ message: 'Family member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export { createUser, verifyEmail, loginUser, logoutUser, forgotPassword ,resetPassword,changePassword,uploadProfile,updateProfile,getProfileById,
  getPublicDoctorAccountById,requestEmailUpdate,confirmEmailUpdate,deleteMe,getUsers,adminUpdateUserStatus,
  createFamilyMember,updateFamilyMember,deleteFamilyMember,getAllFamilyMembers,getOneFamilyMember};
