import jwt from 'jsonwebtoken';
import redisClient from '../config/redis.js';

/**
 * Middleware security guard to lock down private routes
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Extract Bearer token from Authorization header (case-insensitive)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Secondary fallback for browser cookie sessions
    token = req.cookies.token;
  }

  // 2. If no token is present, block entry immediately
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. You must be logged in to view this resource.'
    });
  }

  // Development & Demo mode token fallback (ensures offline preview / demo accounts work)
  if (process.env.NODE_ENV !== 'production' && (token === 'mock-doctor-token' || token === 'mock-admin-token')) {
    req.user = {
      id: token === 'mock-doctor-token' ? '6abd0a4b4ad8c9e8e1741980' : '6abd0a4b4ad8c9e8e174197f',
      role: token === 'mock-doctor-token' ? 'doctor' : 'admin',
      name: token === 'mock-doctor-token' ? 'Dr. Abebe Bekele' : 'System Administrator'
    };
    return next();
  }

  try {
    // 3. Cryptographically decode and verify using unified JWT access secret
    const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'care-sync-ethiopia-fallback-access-secret-2026';
    const decoded = jwt.verify(token, accessSecret);

    // 4. THE REDIS BLACKLIST BARRIER: Check if this specific token session was destroyed on logout
    if (decoded.jti && redisClient) {
      const isBlacklisted = await redisClient.get(`blacklist:${decoded.jti}`);
      
      if (isBlacklisted) {
        return res.status(401).json({ 
          success: false, 
          message: 'Security Alert: This session has been terminated. Please log in again.' 
        });
      }
    }

    // 5. Construct user data directly from the verified token payload
    req.user = {
      id: decoded.userId || decoded.id, // Handles both naming conventions from user-service
      role: decoded.role,
      name: decoded.name
    };

    if (!req.user.role) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication failed: Identity token is missing authorization privileges.' 
      });
    }

    // 6. Success! Pass the request along to the controller
    next();
  } catch (error) {
    console.error(`❌ Authentication Middleware Error: ${error.name} - ${error.message}`);
    const message =
      error.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : error.name === 'JsonWebTokenError'
        ? 'Invalid token. Please log in again.'
        : 'Session invalid or expired. Please log in again.';

    return res.status(401).json({
      success: false,
      message
    });
  }
};

/**
 * Restricts route access strictly to Admin roles
 * Assumes the 'protect' middleware has run first and attached req.user
 */
export const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next(); // User is an admin, let them pass!
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Administrative privileges are required to perform this operation.'
    });
  }
};

export const authorizeDoctor = (req, res, next) => {
  if (req.user && req.user.role === 'doctor') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Doctor privileges are required to perform this operation.'
    });
  }
};

/**
 * Allows both Admin and Front-Desk Receptionist staff roles
 */
export const authorizeStaff = (req, res, next) => {
  if (req.user && ['admin', 'receptionist'].includes(req.user.role)) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Administrative or Front Desk Receptionist privileges are required.'
    });
  }
};

