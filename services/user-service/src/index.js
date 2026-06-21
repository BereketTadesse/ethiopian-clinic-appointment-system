import './config/loadEnv.js';
import path from 'path';
import express from 'express';
import connectDB from './config/db.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import redisClient from './config/redis.js';

const app = express();

// 🎯 Render automatically passes an optimized PORT variable (usually 10000). 
// We must bind to '0.0.0.0' so it is visible outside the Docker container boundary!
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

// 2. 🚀 CRITICAL PROBE CHECK: Define the health route IMMEDIATELY so Render gets an instant 200 OK
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
    // Connect to MongoDB Atlas
    await connectDB();

    // Connect to your newly configured Render Key-Value Redis store
    if (redisClient) {
      try {
        // Only run connect if it hasn't been initialized somewhere else already
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

    // Dynamic import of your user endpoint definitions
    const { default: userRoutes } = await import('./routes/user.route.js');
    app.use('/api/users', userRoutes);

    // 🎯 Start the listener bound explicitly to 0.0.0.0 interface
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Production microservice listening cleanly on address interface 0.0.0.0:${PORT}`);
    });

  } catch (criticalBootError) {
    console.error('❌ CRITICAL ERROR DURING MICROSERVICE APP START:', criticalBootError);
    process.exit(1);
  }
}

start();