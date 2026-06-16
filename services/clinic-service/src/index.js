import './config/loadEnv.js';
import path from 'path';
import express from 'express';
import connectDB from './config/db.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import redisClient from './config/redis.js';
import clinicRoutes from './routes/clinic.routes.js';
import { initSlotCronScheduler } from './cron/slotCron.js';

const app = express();

const PORT = process.env.CLINIC_PORT || 3002;

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://your-clinic-frontend.vercel.app'
    : 'http://localhost:3000',
  credentials: true
}));

app.use(cookieParser());

async function start() {
  connectDB();

  if (redisClient) {
    try {
      await redisClient.connect();
    } catch (err) {
      console.error('❌ Redis Connection Error:', err);
    }
  } else {
    console.warn('⚠️ Redis is not configured. Set REDIS_URL to enable Redis caching/session storage.');
  }

  app.use(express.json());

  // Import routes after Redis connect attempt
  // const { default: clinicRoutes } = await import('./routes/clinic.route.js');
  app.use('/api/clinics', clinicRoutes);

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      message: 'Clinic Service is alive and healthy!'
    });
  });

  // Initialize cron scheduler for slot generation
  initSlotCronScheduler();

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();
