import express from 'express';
import { createUser , verifyEmail,loginUser ,logoutUser, refreshAccessToken, forgotPassword ,resetPassword
    ,changePassword,uploadProfile,updateProfile,createPatientProfile,getProfileById,requestEmailUpdate,
    confirmEmailUpdate,deleteMe,adminUpdateUserStatus,getUsers,getPublicDoctorAccountById,createFamilyMember,updateFamilyMember,deleteFamilyMember,getAllFamilyMembers,getOneFamilyMember,
    createFamilyMemberProfile, getFamilyMemberProfile, updateFamilyMemberProfile,
    createReceptionist, getReceptionists, toggleReceptionistStatus, createDoctor, getFamilyMemberInternal,
    searchPatientsForStaff, registerWalkInPatient
} from '../controllers/user.controller.js';
import { protect , authorizeAdmin, authorizeStaff } from '../middleware/auth.js';
import { requireInternalService } from '../middleware/internal.js';
import upload from '../middleware/upload.js';
import {authRateLimiter, generalRateLimiter} from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validations/auth.validation.js';
import { updateProfileSchema, patientProfileSchema, getProfileByIdSchema, emailUpdateSchema, adminUpdateStatusSchema, getUsersSchema, createReceptionistSchema, createDoctorSchema, searchPatientsSchema, registerWalkInPatientSchema } from '../validations/profile.validation.js';
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
router.get('/verify/:token', generalRateLimiter, verifyEmail);
router.get('/public-doctor-account/:id', generalRateLimiter, getPublicDoctorAccountById);
router.post('/logout', generalRateLimiter, logoutUser);
router.post('/refresh-token', generalRateLimiter, refreshAccessToken);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', generalRateLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/change-password', protect, generalRateLimiter, validate(changePasswordSchema), changePassword);
router.post('/upload-profile', protect, generalRateLimiter, upload.single('profilePicture'), uploadProfile);
router.put('/update-profile', protect, generalRateLimiter, upload.single('profilePicture'), validate(updateProfileSchema), updateProfile);
router.post('/patient-profile', protect, generalRateLimiter, validate(patientProfileSchema), createPatientProfile);
router.get('/profile/:id', protect, generalRateLimiter, validate(getProfileByIdSchema), getProfileById);
router.post('/request-email-update', protect, generalRateLimiter, validate(emailUpdateSchema), requestEmailUpdate);
router.get('/confirm-email-update/:token', confirmEmailUpdate);
router.delete('/delete-me', protect, generalRateLimiter, deleteMe);
router.patch('/admin/update-user-status/:id', protect, authorizeAdmin, generalRateLimiter, validate(adminUpdateStatusSchema), adminUpdateUserStatus);
router.get('/getUsers', protect, authorizeAdmin, generalRateLimiter, validate(getUsersSchema), getUsers);

// Receptionist Staff Management (Admin Only)
router.post('/admin/receptionist', protect, authorizeAdmin, generalRateLimiter, validate(createReceptionistSchema), createReceptionist);
router.get('/admin/receptionists', protect, authorizeAdmin, generalRateLimiter, getReceptionists);
router.patch('/admin/receptionists/:id/toggle', protect, authorizeAdmin, generalRateLimiter, toggleReceptionistStatus);

// Front desk (admin + receptionist): find or register walk-in patients before booking them
router.get('/staff/patients', protect, authorizeStaff, generalRateLimiter, validate(searchPatientsSchema), searchPatientsForStaff);
router.post('/staff/patients', protect, authorizeStaff, generalRateLimiter, validate(registerWalkInPatientSchema), registerWalkInPatient);

// Internal (service-to-service only): appointment-service verifies family members for bookings
router.get('/internal/family-members/:id', requireInternalService, getFamilyMemberInternal);

// Admin-only doctor onboarding (doctors cannot self-register)
router.post('/admin/doctor', protect, authorizeAdmin, generalRateLimiter, validate(createDoctorSchema), createDoctor);


// Family Member routes
router.post('/createFamilyMember', protect, generalRateLimiter, validate(createFamilyMemberSchema), createFamilyMember);
router.patch('/updateFamilyMember/:id', protect, generalRateLimiter, validate(updateFamilyMemberSchema), updateFamilyMember);
router.delete('/deleteFamilyMember/:id', protect, generalRateLimiter, validate(familyMemberIdParamSchema), deleteFamilyMember);
router.get('/getAllFamilyMembers', protect, generalRateLimiter, getAllFamilyMembers);
router.get('/getOneFamilyMember/:id', protect, generalRateLimiter, validate(familyMemberIdParamSchema), getOneFamilyMember);

// Family Member Profile (Medical Info) routes
router.post('/family-member-profile/:familyMemberId', protect, generalRateLimiter, validate(createFamilyMemberProfileSchema), createFamilyMemberProfile);
router.get('/family-member-profile/:familyMemberId', protect, generalRateLimiter, validate(familyMemberProfileParamSchema), getFamilyMemberProfile);
router.patch('/family-member-profile/:familyMemberId', protect, generalRateLimiter, validate(updateFamilyMemberProfileSchema), updateFamilyMemberProfile);

export default router;
