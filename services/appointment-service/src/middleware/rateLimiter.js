import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redisClient from '../config/redis.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

let generalLimiter = null;
let bookingLimiter = null;

// Use the shared Redis store when connected (limits hold across instances); otherwise memory.
const buildStore = (prefix) => {
  if (!redisClient?.isReady) return undefined;
  try {
    return new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args), prefix });
  } catch (err) {
    console.warn(`⚠️ Rate limiter (${prefix}): Redis store unavailable, using memory store.`, err.message);
    return undefined;
  }
};

/**
 * Build the limiters. Call once at startup AFTER the Redis connect attempt.
 */
export const initRateLimiters = () => {
  // Every request to the service, per IP.
  generalLimiter = rateLimit({
    store: buildStore('rl:appt:general:'),
    windowMs: FIFTEEN_MINUTES,
    limit: Number(process.env.APPOINTMENT_RATE_LIMIT_MAX) || 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests from this device. Please slow down and try again shortly.' },
  });

  // Booking, per logged-in patient: stops one account from grabbing many slots.
  // Front-desk staff book walk-ins for many patients, so they are not limited here.
  bookingLimiter = rateLimit({
    store: buildStore('rl:appt:booking:'),
    windowMs: FIFTEEN_MINUTES,
    limit: Number(process.env.BOOKING_RATE_LIMIT_MAX) || 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `user:${req.user.id}`,
    skip: (req) => ['admin', 'receptionist'].includes(req.user?.role),
    message: { success: false, message: 'Too many booking attempts. Please wait a few minutes before trying again.' },
  });
};

// Wrappers so routes can reference the limiters before initRateLimiters() has run.
export const generalRateLimit = (req, res, next) => (generalLimiter ? generalLimiter(req, res, next) : next());
export const bookingRateLimit = (req, res, next) => (bookingLimiter ? bookingLimiter(req, res, next) : next());
