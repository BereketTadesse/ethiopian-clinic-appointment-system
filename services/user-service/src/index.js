import './config/loadEnv.js';
import path from 'path';
import express from 'express';
import connectDB from './config/db.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import redisClient from './config/redis.js';

const app = express();

app.set('trust proxy', 1); // ✅ Trust first proxy hop (Docker gateway / Render's load balancer)

const PORT = process.env.PORT || 3001;

// 1. Global Middleware Layers
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-clinic-frontend.vercel.app' 
    : 'http://localhost:3000',                  
  credentials: true 
}));

app.use(cookieParser());
app.use(express.json());

// 2. 🚀 CRITICAL PROBE CHECK
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    timestamp: new Date(),
    message: 'User Service is alive, healthy, and answering dynamic load-balancer requests!' 
  });
});

// 3. Asynchronous Database Initializer and Listener Launcher
async function start() {
  try {
    await connectDB();

    if (redisClient) {
      try {
        if (!redisClient.isOpen) {
          await redisClient.connect();
          console.log('⚡ User Service connected to Render Redis store successfully!');
        }
      } catch (err) {
        console.error('❌ Redis Connection Error:', err);
        console.log('⚠️ Continuing boot cycle using fallback localized tracking arrays...');
      }
    } else {
      console.warn('⚠️ Redis is not configured. Set REDIS_URL to enable Redis caching/session storage.');
    }

    const { default: userRoutes } = await import('./routes/user.route.js');
    app.use('/api/users', userRoutes);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Production microservice listening cleanly on address interface 0.0.0.0:${PORT}`);
    });

  } catch (criticalBootError) {
    console.error('❌ CRITICAL ERROR DURING MICROSERVICE APP START:', criticalBootError);
    process.exit(1);
  }
}

start();