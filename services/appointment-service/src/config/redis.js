import { createClient } from 'redis';

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    });
    
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    
    await redisClient.connect();
    console.log('Redis connected for appointment-service');
  } catch (error) {
    console.error('Redis connection error:', error);
  }
};

export { connectRedis, redisClient };
