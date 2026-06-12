import './config/loadEnv.js';
import path from 'path';
import express from 'express';
import connectDB from './config/db.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import redisClient from './config/redis.js';



const app = express();

const PORT = process.env.PORT || 5000;


app.use(cors({
  // Allow your local testing setup or your production Vercel frontend address
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-clinic-frontend.vercel.app' // Replace with your future free Vercel URL
    : 'http://localhost:3000',                  // Adjust to your local frontend development port
  credentials: true // 👈 MANDATORY: Grants web browsers permission to pass cookies through the origin firewall
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

  // Import routes after Redis connect attempt so rate limiter can initialize safely
  const { default: userRoutes } = await import('./routes/user.route.js');
  app.use('/api/users', userRoutes);

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    message: 'User Service is alive and healthy!' 
  });
});

// server is started in start()
