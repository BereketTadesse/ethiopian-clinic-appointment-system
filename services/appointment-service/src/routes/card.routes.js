import express from 'express';
import { getMyCard, updateMyCard, getCardByNumber, getCardHistory } from '../controllers/card.controller.js';
import { protect,authorizeDoctor,authorizeAdmin} from '../middleware/auth.js'; 

const router = express.Router();

// Patient routes
router.get('/me', protect, getMyCard);
router.put('/me', protect, updateMyCard);

// Admin & Doctor specific lookup routes
router.get('/:cardNumber', protect,authorizeAdmin,authorizeDoctor, getCardByNumber);
router.get('/:cardNumber/history', authorizeAdmin,authorizeDoctor, getCardHistory);

export default router;