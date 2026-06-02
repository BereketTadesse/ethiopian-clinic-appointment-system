import express from 'express';
import { createUser , verifyEmail,loginUser ,logoutUser,forgotPassword ,resetPassword
    ,changePassword,uploadProfile
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';


const router = express.Router();

router.post('/register', createUser);
router.post('/login', loginUser);
router.get('/verify/:token', verifyEmail);
router.post('/logout', logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/change-password', protect, changePassword);
router.post('/upload-profile', protect, upload.single('profilePicture'), uploadProfile);

export default router;
