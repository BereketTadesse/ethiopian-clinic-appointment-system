import User from '../models/user-service.model.js';
import axios from 'axios';
import PatientProfile from '../models/PatientProfile.js';
import FamilyMember from '../models/family_members.model.js';
import FamilyMemberProfile from '../models/family_member_profile.model.js';
import bcrypt from 'bcryptjs';

const CLINIC_SERVICE_URL = process.env.CLINIC_SERVICE_URL || 'http://localhost:3002';
import sendVerificationEmail from '../utils/send-email.js';
import { getCookieOptions } from '../utils/cookieConfig.js';
import redisClient from '../config/redis.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const getJwtAccessSecret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'care-sync-ethiopia-fallback-access-secret-2026';
const getJwtRefreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET || 'care-sync-ethiopia-fallback-refresh-secret-2026';
const getJwtAccessExpiresIn = () => process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const getJwtRefreshExpiresIn = () => process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const createUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, email, phoneNumber, address, password, role, gender } = req.body;

    if (!name || !email || !phoneNumber || !address || !password || !gender) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    // Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const verificationUrl = `http://localhost:3001/api/users/verify/${verificationToken}`;

    // 2. Build the HTML template string right here inside your controller!
    const subject = "CareSync Ethiopia - Verify & Activate Your Account";

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0;">
                
                <!-- Brand Header -->
                <tr>
                  <td style="padding: 32px 40px 24px; background: linear-gradient(135deg, #4f46e5 0%, #10b981 100%); text-align: center;">
                    <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: rgba(255, 255, 255, 0.2); font-size: 22px; margin-bottom: 10px;">
                      🏥
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                      CareSync <span style="color: #ffffff;">Ethiopia</span>
                    </h1>
                    <p style="margin: 4px 0 0; color: #e0e7ff; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">
                      Official Clinic & Appointment System
                    </p>
                  </td>
                </tr>

                <!-- Main Body -->
                <tr>
                  <td style="padding: 36px 40px 28px;">
                    <h2 style="margin: 0 0 14px; color: #0f172a; font-size: 20px; font-weight: 700;">
                      Welcome, ${name}!
                    </h2>
                    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
                      Thank you for registering your healthcare account. To complete setup and activate your portal access, please verify your email address:
                    </p>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                      <tr>
                        <td align="center">
                          <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; background: linear-gradient(135deg, #4f46e5, #4338ca); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                            Verify & Proceed to Login
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                      Once verified, you will immediately be directed to your sign-in page to start booking clinic visits and managing family care.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 600;">
                      CareSync Ethiopia Healthcare System
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                      Addis Ababa, Ethiopia • Automated notification, please do not reply.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const user = new User({ name, email, phoneNumber, address, password: hashedPassword, role, verificationToken, gender });
    await user.save({ session });

    // Await the email send result
    const emailResult = await sendVerificationEmail(email, subject, htmlTemplate);

    // If the email failed (your util returns null on error), roll back the user creation
    if (!emailResult) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. User creation was aborted.'
      });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

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

    // 4. Redirect directly to frontend Login page!
    const baseClientUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production'
      ? 'https://your-clinic-frontend.vercel.app'
      : 'http://localhost:3000');
    const frontendLoginUrl = `${baseClientUrl.replace(/\/$/, '')}/login?verified=true`;

    return res.redirect(frontendLoginUrl);

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
    if (!user) {
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

    const tokenJti = crypto.randomUUID();

    // Generate Access Token (short-lived)
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role, jti: tokenJti },
      getJwtAccessSecret(),
      { expiresIn: getJwtAccessExpiresIn() }
    );

    // Generate Refresh Token (long-lived)
    const refreshToken = jwt.sign(
      { userId: user._id, jti: tokenJti },
      getJwtRefreshSecret(),
      { expiresIn: getJwtRefreshExpiresIn() }
    );

    // Save Refresh Token to the database
    user.refreshToken = refreshToken;
    await user.save();

    const cookieOptions = getCookieOptions();
    // Modify cookieOptions for the refresh token (e.g. maxAge = 7 days)
    const refreshCookieOptions = {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    };

    // If we get here, the user is authenticated
    // Send accessToken in JSON, refreshToken in HttpOnly cookie
    return res.status(200)
      .cookie('refreshToken', refreshToken, refreshCookieOptions)
      .json({
        message: 'Login successful',
        user,
        accessToken
      });
  } catch (error) {
    console.error(`❌ Error in loginUser: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
}

const logoutUser = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    let accessToken = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      accessToken = authHeader.split(' ')[1];
    }

    // 1. Blacklist Access Token
    if (accessToken) {
      try {
        const decodedAccess = jwt.verify(accessToken, getJwtAccessSecret());
        if (decodedAccess.jti) {
          const remainingSeconds = decodedAccess.exp - Math.floor(Date.now() / 1000);
          if (remainingSeconds > 0) {
            await redisClient.set(`blacklist:${decodedAccess.jti}`, '1', { EX: remainingSeconds });
          }
        }
      } catch (err) {
        console.log("Access token decode skipped during logout");
      }
    }

    // 2. Blacklist Refresh Token & Remove from DB
    if (refreshToken) {
      try {
        const decodedRefresh = jwt.verify(refreshToken, getJwtRefreshSecret());

        await User.findByIdAndUpdate(decodedRefresh.userId, { refreshToken: null });

        if (decodedRefresh.jti) {
          const remainingSeconds = decodedRefresh.exp - Math.floor(Date.now() / 1000);
          if (remainingSeconds > 0) {
            await redisClient.set(`blacklist:${decodedRefresh.jti}`, '1', { EX: remainingSeconds });
          }
        }
      } catch (jwtError) {
        console.log("Refresh token decode skipped during logout execution");
      }
    }

    res.cookie('refreshToken', 'none', {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out cleanly. Tokens revoked securely.'
    });
  } catch (error) {
    console.error(`❌ Logout Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, getJwtRefreshSecret());
    } catch (err) {
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const tokenJti = crypto.randomUUID();
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role, jti: tokenJti },
      getJwtAccessSecret(),
      { expiresIn: getJwtAccessExpiresIn() }
    );

    res.status(200).json({ accessToken });
  } catch (error) {
    console.error(`❌ Error in refreshAccessToken: ${error.message}`);
    res.status(500).json({ message: 'Server error during token refresh' });
  }
};

async function forgotPassword(req, res) {
  try {
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address'
      });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
    await user.save();
    const baseClientUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production'
      ? 'https://your-clinic-frontend.vercel.app'
      : 'http://localhost:3000');
    const frontendUrl = `${baseClientUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;

    // 6. Build the email template right here in the controller
    const subject = "CareSync Ethiopia - Reset Your Password";
    const userName = user.name || 'Valued Patient';
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0;">
                
                <!-- Brand Header -->
                <tr>
                  <td style="padding: 32px 40px 24px; background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); text-align: center;">
                    <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: rgba(255, 255, 255, 0.2); font-size: 22px; margin-bottom: 10px;">
                      🏥
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                      CareSync <span style="color: #6ee7b7;">Ethiopia</span>
                    </h1>
                    <p style="margin: 4px 0 0; color: #c7d2fe; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">
                      Clinic & Healthcare Appointment Portal
                    </p>
                  </td>
                </tr>

                <!-- Main Body -->
                <tr>
                  <td style="padding: 36px 40px 28px;">
                    <h2 style="margin: 0 0 14px; color: #0f172a; font-size: 20px; font-weight: 700;">
                      Password Reset Request
                    </h2>
                    <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
                      Hello <strong>${userName}</strong>,
                    </p>
                    <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.6;">
                      We received a request to reset the password for your CareSync Ethiopia account. Click the button below to choose a new password:
                    </p>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                      <tr>
                        <td align="center">
                          <a href="${frontendUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4f46e5, #4338ca); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                            Reset My Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Security Alert Badge -->
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin: 24px 0 20px;">
                      <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                        ⏱️ <strong>Note:</strong> This secure link will expire in <strong>60 minutes</strong>.
                      </p>
                    </div>

                    <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                      If you did not request a password reset, you can safely ignore this email. Your current password remains protected and active.
                    </p>
                  </td>
                </tr>

                <!-- Direct Link Fallback -->
                <tr>
                  <td style="padding: 0 40px 24px;">
                    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px;">
                      <p style="margin: 0 0 6px; color: #94a3b8; font-size: 11px;">
                        Having trouble with the button? Copy and paste this URL into your browser:
                      </p>
                      <p style="margin: 0; font-size: 11px; word-break: break-all;">
                        <a href="${frontendUrl}" style="color: #4f46e5; text-decoration: underline;">${frontendUrl}</a>
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 600;">
                      CareSync Ethiopia Healthcare System
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                      Addis Ababa, Ethiopia • Automated notification, please do not reply.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
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

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
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

    const currentPassword = req.body.currentPassword || req.body.oldPassword;
    const { newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
      return res.status(400).json({ message: 'New password cannot be the same as the old one' });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(`❌ Change Password Controller Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

const uploadProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let profilePictureURL

    if (req.file) {
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

    } else if (userRole === 'doctor' || userRole === 'admin' || userRole === 'receptionist') {
      // For doctors, admins, and receptionists, core onboarding details are saved on User model.
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
    } else if (userRole === 'admin' || userRole === 'receptionist') {
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

const createPatientProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    // 1. Fetch user to verify they are a patient
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }
    
    if (user.role !== 'patient') {
      return res.status(403).json({ success: false, message: 'Only patients can create a patient profile.' });
    }

    // 2. Check if a profile already exists to prevent duplicates
    const existingProfile = await PatientProfile.findOne({ user: userId });
    if (existingProfile) {
      return res.status(400).json({ success: false, message: 'Patient profile already exists. Use the update endpoint to modify it.' });
    }

    // 3. Create the new profile with the provided medical data
    const newProfile = new PatientProfile({
      user: userId,
      ...req.body
    });

    await newProfile.save();

    // 4. Populate and return the newly created profile
    const populatedProfile = await PatientProfile.findById(newProfile._id)
      .populate('user', 'name email phoneNumber role profilePicture birthDate');

    return res.status(201).json({
      success: true,
      message: 'Patient profile created successfully!',
      data: populatedProfile
    });

  } catch (error) {
    console.error(`❌ Create Patient Profile Error: ${error.message}`);
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

const requestEmailUpdate = async (req, res) => {
  try {
    const { newEmail, currentpassword } = req.body;
    const userId = req.user.id

    if (!newEmail || !currentpassword) {
      return res.status(400).json({ success: false, message: 'Please provide the new email and your current password.' });
    }

    const user = await User.findById(userId).select('+password')

    if (!user) {
      return res.status(400).json({
        success: false, message: 'the user doesnt exist'
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

    // 6. Build the confirmation link pointing to your frontend layout
    const baseClientUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production'
      ? 'https://your-clinic-frontend.vercel.app'
      : 'http://localhost:3000');
    const frontendUrl = `${baseClientUrl.replace(/\/$/, '')}/verify-email-update/${rawUpdateToken}`;

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
const deleteMe = async (req, res) => {
  try {
    const { password } = req.body
    const userId = req.user.id

    if (!password) {
      return res.status(400).json({ message: 'Please provide your current password to confirm account deletion.' });
    }
    const user = await User.findById(userId).select('+password')

    if (!user) {
      return res.status(400).json({ message: 'User account not found.' })
    }
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password credentials. Deletion unauthorized.' });
    };
    const userRole = user.role;
    if (userRole === 'patient') {
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

const adminUpdateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isActive } = req.body;

    const updateFields = {};

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
  catch (error) {
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
    const memberId = req.params.id || req.params.memberId;

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
    const members = await FamilyMember.find({ accountId: req.user._id, isActive: { $ne: false } });

    res.status(200).json({ count: members.length, members });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /family-members/:id
const getOneFamilyMember = async (req, res) => {
  try {
    const memberId = req.params.id || req.params.memberId;
    const member = await FamilyMember.findOne({
      _id: memberId,
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
    const memberId = req.params.id || req.params.memberId;

    const member = await FamilyMember.findOneAndUpdate({
      _id: memberId,
      accountId: req.user._id
    }, { $set: { isActive: false } }, { new: true });

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    res.status(200).json({ message: 'Family member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const testTokens = (req, res) => {
  try {
    let accessToken = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      accessToken = authHeader.split(' ')[1];
    }
    const refreshToken = req.cookies.refreshToken;

    const decodedAccess = accessToken ? jwt.decode(accessToken) : null;
    const decodedRefresh = refreshToken ? jwt.decode(refreshToken) : null;

    res.status(200).json({
      accessTokenPayload: decodedAccess,
      refreshTokenPayload: decodedRefresh
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const checkRefreshTokenStatus = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: 'No refresh token provided. Make sure to log in or pass it in the body.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, getJwtRefreshSecret());
    } catch (err) {
      return res.status(200).json({ status: 'revoked', reason: 'Token is invalid or structurally expired' });
    }

    // 1. Check Redis Blacklist
    if (decoded.jti && redisClient) {
      const isBlacklisted = await redisClient.get(`blacklist:${decoded.jti}`);
      if (isBlacklisted) {
        return res.status(200).json({ status: 'revoked', reason: 'Token JTI was actively blacklisted in Redis' });
      }
    }

    // 2. Check Database
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(200).json({ status: 'revoked', reason: 'Token has been removed from the database (or user was deleted)' });
    }

    return res.status(200).json({ status: 'active', message: 'The refresh token is fully valid and active!' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ==========================================
// FAMILY MEMBER PROFILE (MEDICAL INFO)
// ==========================================
const createFamilyMemberProfile = async (req, res) => {
  try {
    const familyMemberId = req.params.familyMemberId;

    // 1. Verify family member exists and belongs to the user
    const member = await FamilyMember.findOne({ _id: familyMemberId, accountId: req.user._id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Family member not found or access denied.' });
    }

    // 2. Check if profile already exists
    const existingProfile = await FamilyMemberProfile.findOne({ familyMemberId });
    if (existingProfile) {
      return res.status(400).json({ success: false, message: 'Medical profile already exists for this family member.' });
    }

    // 3. Create the profile
    const profile = new FamilyMemberProfile({
      familyMemberId,
      ...req.body
    });

    await profile.save();
    return res.status(201).json({ success: true, data: profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getFamilyMemberProfile = async (req, res) => {
  try {
    const familyMemberId = req.params.familyMemberId;

    // 1. Verify family member exists and belongs to the user
    const member = await FamilyMember.findOne({ _id: familyMemberId, accountId: req.user._id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Family member not found or access denied.' });
    }

    // 2. Fetch the profile
    const profile = await FamilyMemberProfile.findOne({ familyMemberId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Medical profile not found.' });
    }

    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateFamilyMemberProfile = async (req, res) => {
  try {
    const familyMemberId = req.params.familyMemberId;

    // 1. Verify family member exists and belongs to the user
    const member = await FamilyMember.findOne({ _id: familyMemberId, accountId: req.user._id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Family member not found or access denied.' });
    }

    // 2. Update the profile
    const profile = await FamilyMemberProfile.findOneAndUpdate(
      { familyMemberId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Medical profile not found.' });
    }

    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// 📋 RECEPTIONIST MANAGEMENT (ADMIN CONTROLLED)
// ============================================================

/**
 * @desc    Admin creates a front-desk receptionist account with direct credentials
 * @route   POST /api/users/admin/receptionist
 * @access  Private (Admin Only)
 */
const createReceptionist = async (req, res) => {
  try {
    const { name, email, phoneNumber, password, gender, address } = req.body;

    if (!name || !email || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone number, and password are required to onboard a receptionist.'
      });
    }

    // Check if user already exists with this email or phone
    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { phoneNumber: phoneNumber.trim() }]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: existing.email === email.toLowerCase().trim()
          ? 'An account with this email address already exists.'
          : 'An account with this phone number already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const receptionist = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phoneNumber: phoneNumber.trim(),
      password: hashedPassword,
      gender: gender || 'female',
      address: address ? address.trim() : 'Addis Ababa, Ethiopia',
      role: 'receptionist',
      isVerified: true, // Direct onboarding by admin: pre-verified
      isActive: true
    });

    const safeReceptionist = await User.findById(receptionist._id).select('-password');

    return res.status(201).json({
      success: true,
      message: 'Front Desk Receptionist created successfully! They can log in immediately.',
      data: safeReceptionist
    });
  } catch (error) {
    console.error(`❌ Create Receptionist Error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

/**
 * @desc    Admin lists all clinic receptionists
 * @route   GET /api/users/admin/receptionists
 * @access  Private (Admin Only)
 */
const getReceptionists = async (req, res) => {
  try {
    const receptionists = await User.find({ role: 'receptionist' })
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: receptionists.length,
      data: receptionists
    });
  } catch (error) {
    console.error(`❌ Get Receptionists Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc    Admin toggles active/suspended status for a receptionist
 * @route   PATCH /api/users/admin/receptionists/:id/toggle
 * @access  Private (Admin Only)
 */
const toggleReceptionistStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const receptionist = await User.findOne({ _id: id, role: 'receptionist' });

    if (!receptionist) {
      return res.status(404).json({ success: false, message: 'Receptionist account not found.' });
    }

    receptionist.isActive = !receptionist.isActive;
    await receptionist.save();

    return res.status(200).json({
      success: true,
      message: `Receptionist has been ${receptionist.isActive ? 'activated' : 'suspended'}.`,
      data: {
        _id: receptionist._id,
        name: receptionist.name,
        email: receptionist.email,
        isActive: receptionist.isActive
      }
    });
  } catch (error) {
    console.error(`❌ Toggle Receptionist Status Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export {
  createUser, verifyEmail, loginUser, logoutUser, refreshAccessToken, testTokens, checkRefreshTokenStatus, forgotPassword, resetPassword, changePassword, uploadProfile, updateProfile, createPatientProfile, getProfileById,
  getPublicDoctorAccountById, requestEmailUpdate, confirmEmailUpdate, deleteMe, getUsers, adminUpdateUserStatus,
  createFamilyMember, updateFamilyMember, deleteFamilyMember, getAllFamilyMembers, getOneFamilyMember,
  createFamilyMemberProfile, getFamilyMemberProfile, updateFamilyMemberProfile,
  createReceptionist, getReceptionists, toggleReceptionistStatus
};

