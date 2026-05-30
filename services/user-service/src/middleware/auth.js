import jwt from 'jsonwebtoken';
import User from '../models/user-service.model.js';

/**
 * Middleware security guard to lock down private routes
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Extract the token straight out of the incoming request cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 2. If no cookie token is present, block entry immediately
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. You must be logged in to view this resource.'
    });
  }

  try {
    // 3. Cryptographically decode and verify the token signature using your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Fetch the full user details from MongoDB Atlas using the ID embedded inside the token
    // Note: tokens are signed with `{ userId: user._id }` in the auth flow
    req.user = await User.findById(decoded.userId).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User record no longer exists.' });
    }

    // 5. Success! Pass the request along to the actual controller logic
    next();
    
  } catch (error) {
    console.error(`❌ Authentication Middleware Error: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Session invalid or expired. Please log in again.'
    });
  }
};