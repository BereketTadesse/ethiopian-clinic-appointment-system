import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

const redisClient = redisUrl ? createClient({ url: redisUrl }) : null;

if (redisClient) {
  redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err));
  redisClient.on('connect', () => console.log('☁️ User Service connected to Redis Cache Memory Engine'));
}

export default redisClient;
