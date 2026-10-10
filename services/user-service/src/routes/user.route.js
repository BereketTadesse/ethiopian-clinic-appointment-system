import express from 'express';
import { createUser , verifyEmail,loginUser ,logoutUser, refreshAccessToken, testTokens, checkRefreshTokenStatus, forgotPassword ,resetPassword
    ,changePassword,uploadProfile,updateProfile,createPatientProfile,getProfileById,requestEmailUpdate,
    confirmEmailUpdate,deleteMe,adminUpdateUserStatus,getUsers,getPublicDoctorAccountById,createFamilyMember,updateFamilyMember,deleteFamilyMember,getAllFamilyMembers,getOneFamilyMember,
    createFamilyMemberProfile, getFamilyMemberProfile, updateFamilyMemberProfile
} from '../controllers/user.controller.js';
import { protect , authorizeAdmin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {authRateLimiter, generalRateLimiter} from '../middleware/rateLimiter.js';


const router = express.Router();

router.post('/register', authRateLimiter, createUser);
router.post('/login', authRateLimiter, loginUser);
router.get('/verify/:token',generalRateLimiter, verifyEmail);
router.get('/public-doctor-account/:id', generalRateLimiter, getPublicDoctorAccountById);
router.post('/logout', authRateLimiter, logoutUser);
router.post('/refresh-token', authRateLimiter, refreshAccessToken);
router.get('/test-tokens', testTokens);
router.post('/check-refresh-token', checkRefreshTokenStatus);
router.get('/check-refresh-token', checkRefreshTokenStatus);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password/:token',generalRateLimiter, resetPassword);
router.post('/change-password', protect,generalRateLimiter, changePassword);
router.post('/upload-profile', protect, generalRateLimiter, upload.single('profilePicture'), uploadProfile);
router.put('/update-profile', protect, generalRateLimiter, upload.single('profilePicture'), updateProfile);
router.post('/patient-profile', protect, generalRateLimiter, createPatientProfile);
router.get('/profile/:id', protect, generalRateLimiter, getProfileById);
router.post('/request-email-update', protect,authRateLimiter, requestEmailUpdate);
router.get('/confirm-email-update/:token',confirmEmailUpdate);
router.delete('/delete-me', protect, generalRateLimiter, deleteMe);
router.patch('/admin/update-user-status/:id', protect, authorizeAdmin, generalRateLimiter, adminUpdateUserStatus);
router.get('/getUsers', protect, authorizeAdmin, generalRateLimiter, getUsers);

// family meber routes
router.post('/createFamilyMember', protect,authRateLimiter, createFamilyMember);
router.patch('/updateFamilyMember/:id', protect,authRateLimiter, updateFamilyMember);
router.delete('/deleteFamilyMember/:id', protect, authRateLimiter, deleteFamilyMember);
router.get('/getAllFamilyMembers', protect,authRateLimiter, getAllFamilyMembers);
router.get('/getOneFamilyMember/:id', protect,authRateLimiter, getOneFamilyMember);

// Family Member Profile (Medical Info) routes
router.post('/family-member-profile/:familyMemberId', protect, authRateLimiter, createFamilyMemberProfile);
router.get('/family-member-profile/:familyMemberId', protect, authRateLimiter, getFamilyMemberProfile);
router.patch('/family-member-profile/:familyMemberId', protect, authRateLimiter, updateFamilyMemberProfile);

export default router;
