import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redisClient from '../config/redis.js';
import { hasValidInternalSecret } from './auth.js';

/**
 * Builds the clinic-service rate limiter. Call it AFTER Redis has connected:
 * a connected Redis gives a limit shared across instances; otherwise it falls
 * back to an in-memory store (per-instance).
 *
 * Calls from other services (valid x-internal-service-secret) are never limited,
 * since they all arrive from one IP and would otherwise throttle real bookings.
 */
export const createGeneralRateLimiter = () => {
  let store;
  if (redisClient?.isReady) {
    try {
      store = new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: 'rl:clinic:',
      });
    } catch (err) {
      console.warn('⚠️ Clinic rate limiter: Redis store unavailable, using memory store.', err.message);
    }
  }

  return rateLimit({
    store,
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: Number(process.env.CLINIC_RATE_LIMIT_MAX) || 500,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => hasValidInternalSecret(req),
    message: {
      success: false,
      message: 'Too many requests from this device. Please slow down and try again shortly.'
    },
  });
};
