import express from 'express';
import { createUser , verifyEmail,loginUser ,logoutUser,forgotPassword ,resetPassword
    ,changePassword,uploadProfile,updateProfile,getProfileById,requestEmailUpdate,
    confirmEmailUpdate,deleteMe,adminUpdateUserStatus,getUsers
} from '../controllers/user.controller.js';
import { protect , authorizeAdmin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {authRateLimiter, generalRateLimiter} from '../middleware/rateLimiter.js';


const router = express.Router();

router.post('/register', authRateLimiter, createUser);
router.post('/login', authRateLimiter, loginUser);
router.get('/verify/:token',generalRateLimiter, verifyEmail);
router.post('/logout', authRateLimiter, logoutUser);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password/:token',generalRateLimiter, resetPassword);
router.post('/change-password', protect,generalRateLimiter, changePassword);
router.post('/upload-profile', protect, generalRateLimiter, upload.single('profilePicture'), uploadProfile);
router.put('/update-profile', protect, generalRateLimiter, upload.single('profilePicture'), updateProfile);
router.get('/profile/:id', protect, generalRateLimiter, getProfileById);
router.post('/request-email-update', protect,authRateLimiter, requestEmailUpdate);
router.get('/confirm-email-update/:token', confirmEmailUpdate);
router.delete('/delete-me', protect, generalRateLimiter, deleteMe);
router.patch('/admin/update-user-status/:id', protect, authorizeAdmin, generalRateLimiter, adminUpdateUserStatus);
router.get('/getUsers', protect, authorizeAdmin, generalRateLimiter, getUsers);


export default router;
