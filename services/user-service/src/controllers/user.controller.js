import User from '../models/user-service.model.js';
import DoctorProfile from '../models/DoctorProfile.js';
import PatientProfile from '../models/PatientProfile.js';
import bcrypt from 'bcryptjs';
import sendVerificationEmail from '../utils/send-email.js';
import { getCookieOptions } from '../utils/cookieConfig.js';
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
        sendVerificationEmail(email, verificationToken);
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

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
        const cookieOptions = getCookieOptions();


        // If we get here, the user is authenticated
        return res.status(200)
        .cookie('token', token, cookieOptions)
        .json({ message: 'Login successful', user, token });
    } catch (error) {
        console.error(`❌ Error in loginUser: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }}

    const logoutUser = async (req, res) => {
  try {
    const cookieOptions = getCookieOptions();
    // Logout uses the exact same security options, but wipes the token value 
    // and sets the expiration to the Unix Epoch (1970) so the browser drops it instantly.
    return res.status(200)
      .cookie('token', '', { 
        ...cookieOptions, 
        expires: new Date(0) 
      }) 
      .json({
        success: true,
        message: 'Logged out successfully! Session cleared.'
      });
      
  } catch (error) {
    console.error(`❌ Logout Controller Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const forgotPassword = async (req, res) => {
    try {
        const {email} = req.body;
        if(!email){
            return res.status(400).json({message: 'Email is required'});
        }
        const user = await User.findOne({email});
        if(!user){
            return res.status(404).json({message: 'User not found'});
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

      // 🎯 UPDATE COMMON TABLE: Save the image url directly onto the master User document
      await User.findByIdAndUpdate(userId, { profilePicture: profilePictureURL });
      }
    const extraDetails = { ...req.body };
    
    let detailedProfile;

    if (userRole === 'patient') {
      // fields expected here from user input: address, birthDate, gender, emergencyContact
      detailedProfile = await PatientProfile.findOneAndUpdate(
        { user: userId },
        { $set: extraDetails },
        { new: true, upsert: true } // upsert creates the document if this is their first time onboarding!
      ).populate('user', 'name email phoneNumber role profilePicture');

    } else if (userRole === 'doctor') {
      // fields expected here from user input: specialization, licenseNumber, consultationFee, address
      detailedProfile = await DoctorProfile.findOneAndUpdate(
        { user: userId },
        { $set: extraDetails },
        { new: true, upsert: true }
      ).populate('user', 'name email phoneNumber role profilePicture');
      
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


export { createUser, verifyEmail, loginUser, logoutUser, forgotPassword ,resetPassword,changePassword,uploadProfile};