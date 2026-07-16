import './config/loadEnv.js';
import path from 'path';
import express from 'express';
import connectDB from './config/db.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import redisClient from './config/redis.js';
import clinicRoutes from './routes/clinic.routes.js';
import { initSlotCronScheduler, runDailySlotAllocation } from './cron/slotCron.js';

const app = express();

app.use(express.json());         // ✅ Parse JSON bodies on ALL routes
app.use(express.urlencoded({ extended: true })); // ✅ Also parse form data

const PORT = process.env.PORT || process.env.CLINIC_PORT || 3002;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://your-clinic-frontend.vercel.app';

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? FRONTEND_URL
    : 'http://localhost:3000',
  credentials: true
}));

app.use(cookieParser());

async function start() {
  await connectDB(); // ⚠️ Must await — slot generation below needs the DB to be ready

  if (redisClient) {
    try {
      await redisClient.connect();
    } catch (err) {
      console.error('❌ Redis Connection Error:', err);
    }
  } else {
    console.warn('⚠️ Redis is not configured. Set REDIS_URL to enable Redis caching/session storage.');
  }



  // Import routes after Redis connect attempt
  // const { default: clinicRoutes } = await import('./routes/clinic.route.js');
  app.use('/api/clinics', clinicRoutes);

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      message: 'Clinic Service is alive and healthy!'
    });
  });

  // Initialize cron scheduler for midnight automatic slot generation
  initSlotCronScheduler();

  // 🚀 Run slot generation immediately on startup so slots exist right away.
  // Today (daysAhead=0)   → patients can book NOW
  // Tomorrow (daysAhead=1) → pre-populate the next day's schedule
  // Safe to call multiple times: MongoDB unique index prevents any duplicates.
  runDailySlotAllocation(0); // today
  runDailySlotAllocation(1); // tomorrow

  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

start();
