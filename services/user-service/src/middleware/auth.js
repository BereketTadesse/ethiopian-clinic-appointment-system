import jwt from 'jsonwebtoken';
import User from '../models/user-service.model.js';
import redisClient from '../config/redis.js';

/**
 * Middleware security guard to lock down private routes
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Extract token from Authorization header (case-insensitive)
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. If no token is present, block entry immediately
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. You must be logged in to view this resource.'
    });
  }

  try {
    // 3. Verify the token signature using Access Secret
    const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!accessSecret) {
      return res.status(500).json({ success: false, message: 'Server authentication configuration error.' });
    }
    const decoded = jwt.verify(token, accessSecret);

    // 4. Redis blacklist check
    if (decoded.jti && redisClient) {
      const isBlacklisted = await redisClient.get(`blacklist:${decoded.jti}`);
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          message: 'Security Alert: This session has been terminated. Please log in again.'
        });
      }
    }

    // 5. Fetch user from DB
    req.user = await User.findById(decoded.userId).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User record no longer exists.' });
    }

    if (req.user.isActive === false) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated. Please contact the clinic administrator.' });
    }

    // 6. All good, proceed
    next();

  } catch (error) {
    console.error('❌ Authentication Middleware Error:', error.name, '-', error.message);

    const message =
      error.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : error.name === 'JsonWebTokenError'
        ? 'Invalid token. Please log in again.'
        : 'Session invalid. Please log in again.';

    return res.status(401).json({ success: false, message });
  }
};

/**
 * Restricts route access strictly to Admin roles
 * Assumes the 'protect' middleware has run first and attached req.user
 */
export const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Administrative privileges are required to perform this operation.'
    });
  }
};