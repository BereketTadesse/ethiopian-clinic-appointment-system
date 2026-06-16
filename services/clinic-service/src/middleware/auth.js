import jwt from 'jsonwebtoken';
import redisClient from '../config/redis.js';

/**
 * Middleware security guard to lock down private routes
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Extract the token straight out of the incoming request cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Optional fallback if you want to support Authorization headers during Postman tests
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. If no token is present, block entry immediately
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. You must be logged in to view this resource.'
    });
  }

  try {
    // 3. Cryptographically decode and verify the token signature using your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. THE REDIS BLACKLIST BARRIER: Check if this specific token session was destroyed on logout
    if (decoded.jti) {
      const isBlacklisted = await redisClient.get(`blacklist:${decoded.jti}`);
      
      if (isBlacklisted) {
        return res.status(401).json({ 
          success: false, 
          message: 'Security Alert: This session has been terminated. Please log in again.' 
        });
      }
    }

    // 5. FIXED: No more User.findById database check!
    // Instead, we construct the user data directly from the verified token payload.
    // Ensure your User Service includes 'role' when it signs the JWT token!
    req.user = {
      id: decoded.userId || decoded.id, // Fallback safety to check both common naming formats
      role: decoded.role,
      name: decoded.name // optional addition if needed
    };

    if (!req.user.role) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication failed: Identity token is missing authorization privileges.' 
      });
    }

    // 6. Success! Pass the request along to the actual controller logic
    next();
  } catch (error) {
    console.error(`❌ Authentication Middleware Error: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Session invalid or expired. Please log in again.'
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
    next(); // User is an admin, let them pass!
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Administrative privileges are required to perform this operation.'
    });
  }
};