import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import redisClient from '../config/redis.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!accessSecret) {
      return res.status(500).json({ message: 'Server authentication configuration error.' });
    }
    const decoded = jwt.verify(token, accessSecret);
    // user-service signs tokens with `userId`; normalise to `req.user.id` used throughout this service.
    req.user = { ...decoded, id: String(decoded.userId || decoded.id || '') };
    if (!req.user.id || !req.user.role) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    if (redisClient?.isReady) {
      // Logged-out session (user-service blacklists the token's jti on logout)
      if (decoded.jti && await redisClient.get(`blacklist:${decoded.jti}`)) {
        return res.status(401).json({ message: 'This session has been terminated. Please log in again.' });
      }
      // Account deactivated by the admin (flag set by user-service)
      if (await redisClient.get(`user:disabled:${req.user.id}`)) {
        return res.status(403).json({ message: 'This account has been deactivated. Please contact the clinic administrator.' });
      }
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorizePatient = (req, res, next) => {
  if (req.user?.role !== 'patient') {
    return res.status(403).json({ message: 'Access denied: Patient role required' });
  }
  next();
};

export const authorizeDoctor = (req, res, next) => {
  if (req.user?.role !== 'doctor') {
    return res.status(403).json({ message: 'Access denied: Doctor role required' });
  }
  next();
};

export const authorizeAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin role required' });
  }
  next();
};

export const authorizeStaff = (req, res, next) => {
  if (['admin', 'receptionist'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Admin or Receptionist role required' });
};

export const authorizePatientOrStaff = (req, res, next) => {
  if (['patient', 'admin', 'receptionist'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Patient or Staff role required' });
};

export const authorizeStaffOrDoctor = (req, res, next) => {
  if (['admin', 'receptionist', 'doctor'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Staff or Doctor role required' });
};



/**
 * Service-to-service only routes: requires the shared INTERNAL_SERVICE_SECRET
 * in the x-internal-service-secret header (constant-time comparison). User tokens are not accepted.
 */
export const requireInternalService = (req, res, next) => {
  const expected = process.env.INTERNAL_SERVICE_SECRET;
  const provided = req.headers['x-internal-service-secret'];
  if (expected && typeof provided === 'string') {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: internal services only.' });
};
