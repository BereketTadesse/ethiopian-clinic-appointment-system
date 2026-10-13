import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

// Ignore localhost/127.0.0.1 Redis URLs when deployed on Render cloud
const isLocalhostInProd = process.env.NODE_ENV === 'production' && redisUrl && (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1'));

let redisClient = null;

if (redisUrl && !isLocalhostInProd) {
  try {
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err.message));
    redisClient.on('connect', () => console.log('☁️ User Service connected to Redis Cache Memory Engine'));
  } catch (err) {
    console.warn('⚠️ Redis initialization error, using in-memory fallback:', err.message);
    redisClient = null;
  }
} else if (isLocalhostInProd) {
  console.warn('ℹ️ REDIS_URL points to localhost in production. Disabling Redis and using fast in-memory rate limiting.');
}

export default redisClient;
