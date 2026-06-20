import ratelimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../config/redis.js';

function createRedisStore(prefix) {
  if (!redisClient) return undefined;
  try {
    // rate-limit-redis will call sendCommandFn(...command)
    // where command is an array of tokens. We must forward that array as a single
    // command argument to node-redis.
    return new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix,
    });
  } catch (err) {
    console.warn('⚠️ Rate limiter: failed to create Redis store, falling back to MemoryStore', err);
    return undefined;
  }
}

const authRateLimiter = ratelimit({
  store: createRedisStore('rl:auth:'),
  windowMs: 15 * 60 * 1000, // 15 Minute dynamic sliding window
  max: 10, // Strictly caps each unique IP address to 10 requests per window
  message: {
    success: false,
    message: "Security Alert: Too many requests from this device. Please try again after 15 minutes."
  },
  standardHeaders: true, // Returns rate limit info in the 'RateLimit-*' headers
  legacyHeaders: false, // Disables old 'X-RateLimit-*' headers
});

const generalRateLimiter = ratelimit({
  store: createRedisStore('rl:general:'),
  windowMs: 15 * 60 * 1000, // 15 Minutes
  max: 100, // Allows up to 100 requests (Perfect for normal frontend interactions)
  message: {
    success: false,
    message: "High traffic volumes detected. Rate limit exceeded, please slow down."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export { authRateLimiter, generalRateLimiter };