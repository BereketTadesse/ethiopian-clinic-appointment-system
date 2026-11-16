import * as cardService from '../services/card.service.js';
import mongoose from 'mongoose';
import Appointment from '../models/appointment.model.js';

/**
 * Optional ?familyMemberId= (or body.familyMemberId) selects a family member's card.
 * Cards are always looked up under the logged-in account, so a patient can only
 * reach cards of their own family.
 * @returns null for the account holder, an id string, or false if invalid
 */
const familyMemberParam = (req) => {
  const value = req.query.familyMemberId ?? req.body?.familyMemberId;
  if (value === undefined || value === null || value === '' || value === 'self') return null;
  return mongoose.Types.ObjectId.isValid(value) ? String(value) : false;
};

const getMyCard = async (req, res) => {
  try {
    const patientId = req.user.id;
    const incomingToken = req.headers.authorization?.split(' ')[1] || null;
    const familyMemberId = familyMemberParam(req);
    if (familyMemberId === false) {
      return res.status(400).json({ success: false, message: 'Invalid familyMemberId.' });
    }

    // Pass token along to authorize inter-service data fetching
    const card = await cardService.findCardByPatientId(patientId, incomingToken, familyMemberId);

    if (!card) {
      return res.status(200).json({
        success: true,
        message: 'No active clinical patient card is established yet. Your permanent card number will generate automatically upon your initial appointment reservation.',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      data: card
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to look up personal card details.',
      error: error.message
    });
  }
};

const updateMyCard = async (req, res) => {
  try {
    const patientId = req.user.id;
    const incomingToken = req.headers.authorization?.split(' ')[1] || null;

    const familyMemberId = familyMemberParam(req);
    if (familyMemberId === false) {
      return res.status(400).json({ success: false, message: 'Invalid familyMemberId.' });
    }

    const updatedCard = await cardService.updateCardBackground(patientId, req.body, incomingToken, familyMemberId);

    if (!updatedCard) {
      return res.status(404).json({
        success: false,
        message: 'Cannot update details. Ensure you have booked at least one appointment to establish your profile footprint.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Medical card attributes successfully updated and synchronized with Master User records.',
      data: updatedCard
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to append update changes to medical history records.',
      error: error.message
    });
  }
};
const getCardByNumber = async (req, res) => {
  try {
    const { cardNumber } = req.params;
    const incomingToken = req.headers.authorization?.split(' ')[1] || null;

    const card = await cardService.findCardByCardNumber(cardNumber, incomingToken);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: `Patient card record '${cardNumber}' was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: card
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error looking up patient card record.',
      error: error.message
    });
  }
};

const getCardHistory = async (req, res) => {
  try {
    const { cardNumber } = req.params;

    // Find all matching appointment files, sorting by date descending (newest first)
    const history = await Appointment.find({ cardNumber }).sort({ date: -1, startTime: -1 });

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching patient appointment history logs.',
      error: error.message
    });
  }
};

/**
 * @desc    All cards on the logged-in account: the holder's own and each family member's
 * @route   GET /api/cards/family
 */
const getFamilyCards = async (req, res) => {
  const cards = await cardService.findCardsForAccount(req.user.id);
  return res.status(200).json({ success: true, count: cards.length, data: cards });
};

export { getMyCard, updateMyCard, getCardByNumber, getCardHistory, getFamilyCards };