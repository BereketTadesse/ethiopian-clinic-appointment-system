import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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

  try {
    // 3. Cryptographically decode and verify using unified JWT access secret
    const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!accessSecret) {
      return res.status(500).json({ success: false, message: 'Server authentication configuration error.' });
    }
    const decoded = jwt.verify(token, accessSecret);

    // 4. THE REDIS BLACKLIST BARRIER: Check if this specific token session was destroyed on logout
    // (isReady guard: if Redis is configured but down, don't turn every request into a 401)
    if (decoded.jti && redisClient?.isReady) {
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

    // 5b. Deactivated accounts: user-service sets this flag in the shared Redis when an admin
    // deactivates a user, so their still-unexpired token is rejected here immediately.
    if (redisClient?.isReady && await redisClient.get(`user:disabled:${req.user.id}`)) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact the clinic administrator.'
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

/**
 * Restricts access to Doctors or Administrators (e.g. for doctor leave routes)
 */
export const authorizeDoctorOrAdmin = (req, res, next) => {
  if (req.user && ['admin', 'doctor'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access Denied: Only doctors or administrators can access leave management.'
  });
};

/**
 * Inter-service or clinical staff authorization for slot lock/release endpoints.
 * Allows calls with a valid INTERNAL_SERVICE_SECRET header OR an authenticated staff token.
 */
export const protectInternalOrStaff = async (req, res, next) => {
  // 1. Authorized via internal service-to-service secret
  if (hasValidInternalSecret(req)) {
    return next();
  }

  // 2. Otherwise verify authenticated staff role (admin, doctor, receptionist)
  if (!req.user) {
    return protect(req, res, () => {
      if (req.user && ['admin', 'doctor', 'receptionist'].includes(req.user.role)) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Direct slot status operations are restricted to internal services and clinical staff.'
      });
    });
  }

  if (['admin', 'doctor', 'receptionist'].includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access Denied: Direct slot status operations are restricted to internal services and clinical staff.'
  });
};



/**
 * Constant-time check of the x-internal-service-secret header against INTERNAL_SERVICE_SECRET.
 */
export const hasValidInternalSecret = (req) => {
  const expected = process.env.INTERNAL_SERVICE_SECRET;
  const provided = req.headers['x-internal-service-secret'];
  if (!expected || typeof provided !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/**
 * Service-to-service only routes (no user tokens accepted).
 */
export const requireInternalService = (req, res, next) => {
  if (hasValidInternalSecret(req)) return next();
  return res.status(403).json({
    success: false,
    message: 'Access Denied: This endpoint is restricted to internal services.'
  });
};
