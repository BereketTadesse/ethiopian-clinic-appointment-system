import jwt from 'jsonwebtoken';
import User from '../models/user-service.model.js';
import redisClient from '../config/redis.js';

/**
 * Middleware security guard to lock down private routes
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Extract token from Authorization header (case-insensitive) or cookie
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 🔍 DEBUG: Log what arrived (remove after fixing)
  console.log('🔍 Auth header received:', authHeader);
  console.log('🔍 Raw token extracted:', token);
  console.log('🔑 JWT_SECRET prefix:', process.env.JWT_SECRET?.slice(0, 10) + '...');

  // 2. If no token is present, block entry immediately
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. You must be logged in to view this resource.'
    });
  }

  try {
    // 3. Verify the token signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded successfully:', decoded);

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

    // 6. All good, proceed
    next();

  } catch (error) {
    // 🔍 DEBUG: Decode without verifying to inspect token contents
    const rawDecoded = jwt.decode(token);
    console.error('❌ Authentication Middleware Error:', error.name, '-', error.message);
    console.error('🔍 Token payload (unverified):', rawDecoded);
    console.error('🔍 Error type breakdown:', {
      isExpired: error.name === 'TokenExpiredError',
      isMalformed: error.name === 'JsonWebTokenError',
      isNotBefore: error.name === 'NotBeforeError',
    });

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