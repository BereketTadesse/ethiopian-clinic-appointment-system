import express from 'express';
import { createUser , verifyEmail,loginUser ,logoutUser, refreshAccessToken, testTokens, checkRefreshTokenStatus, forgotPassword ,resetPassword
    ,changePassword,uploadProfile,updateProfile,createPatientProfile,getProfileById,requestEmailUpdate,
    confirmEmailUpdate,deleteMe,adminUpdateUserStatus,getUsers,getPublicDoctorAccountById,createFamilyMember,updateFamilyMember,deleteFamilyMember,getAllFamilyMembers,getOneFamilyMember,
    createFamilyMemberProfile, getFamilyMemberProfile, updateFamilyMemberProfile
} from '../controllers/user.controller.js';
import { protect , authorizeAdmin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {authRateLimiter, generalRateLimiter} from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validations/auth.validation.js';
import { updateProfileSchema, patientProfileSchema, getProfileByIdSchema, emailUpdateSchema, adminUpdateStatusSchema, getUsersSchema } from '../validations/profile.validation.js';
import {
  createFamilyMemberSchema,
  updateFamilyMemberSchema,
  familyMemberIdParamSchema,
  familyMemberProfileParamSchema,
  createFamilyMemberProfileSchema,
  updateFamilyMemberProfileSchema
} from '../validations/family.validation.js';


const router = express.Router();

router.post('/register', authRateLimiter, validate(registerSchema), createUser);
router.post('/login', authRateLimiter, validate(loginSchema), loginUser);
router.get('/verify/:token',generalRateLimiter, verifyEmail);
router.get('/public-doctor-account/:id', generalRateLimiter, getPublicDoctorAccountById);
router.post('/logout', authRateLimiter, logoutUser);
router.post('/refresh-token', authRateLimiter, refreshAccessToken);
router.get('/test-tokens', testTokens);
router.post('/check-refresh-token', checkRefreshTokenStatus);
router.get('/check-refresh-token', checkRefreshTokenStatus);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token',generalRateLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/change-password', protect,generalRateLimiter, validate(changePasswordSchema), changePassword);
router.post('/upload-profile', protect, generalRateLimiter, upload.single('profilePicture'), uploadProfile);
router.put('/update-profile', protect, generalRateLimiter, upload.single('profilePicture'), validate(updateProfileSchema), updateProfile);
router.post('/patient-profile', protect, generalRateLimiter, validate(patientProfileSchema), createPatientProfile);
router.get('/profile/:id', protect, generalRateLimiter, validate(getProfileByIdSchema), getProfileById);
router.post('/request-email-update', protect,authRateLimiter, validate(emailUpdateSchema), requestEmailUpdate);
router.get('/confirm-email-update/:token',confirmEmailUpdate);
router.delete('/delete-me', protect, generalRateLimiter, deleteMe);
router.patch('/admin/update-user-status/:id', protect, authorizeAdmin, generalRateLimiter, validate(adminUpdateStatusSchema), adminUpdateUserStatus);
router.get('/getUsers', protect, authorizeAdmin, generalRateLimiter, validate(getUsersSchema), getUsers);

// family meber routes
router.post('/createFamilyMember', protect, authRateLimiter, validate(createFamilyMemberSchema), createFamilyMember);
router.patch('/updateFamilyMember/:id', protect, authRateLimiter, validate(updateFamilyMemberSchema), updateFamilyMember);
router.delete('/deleteFamilyMember/:id', protect, authRateLimiter, validate(familyMemberIdParamSchema), deleteFamilyMember);
router.get('/getAllFamilyMembers', protect, authRateLimiter, getAllFamilyMembers);
router.get('/getOneFamilyMember/:id', protect, authRateLimiter, validate(familyMemberIdParamSchema), getOneFamilyMember);

// Family Member Profile (Medical Info) routes
router.post('/family-member-profile/:familyMemberId', protect, authRateLimiter, validate(createFamilyMemberProfileSchema), createFamilyMemberProfile);
router.get('/family-member-profile/:familyMemberId', protect, authRateLimiter, validate(familyMemberProfileParamSchema), getFamilyMemberProfile);
router.patch('/family-member-profile/:familyMemberId', protect, authRateLimiter, validate(updateFamilyMemberProfileSchema), updateFamilyMemberProfile);

export default router;
