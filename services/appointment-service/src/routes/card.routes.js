import express from 'express';
import { getMyCard, updateMyCard, getCardByNumber, getCardHistory, getFamilyCards } from '../controllers/card.controller.js';
import { protect, authorizeStaffOrDoctor } from '../middleware/auth.js'; 

const router = express.Router();

// Patient routes
router.get('/me', protect, getMyCard);
router.put('/me', protect, updateMyCard);
router.get('/family', protect, getFamilyCards); // must stay above '/:cardNumber'

// Staff (Admin/Receptionist) & Doctor specific lookup routes
router.get('/:cardNumber', protect, authorizeStaffOrDoctor, getCardByNumber);
router.get('/:cardNumber/history', protect, authorizeStaffOrDoctor, getCardHistory);

export default router;