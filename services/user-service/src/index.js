import './config/loadEnv.js';
import path from 'path';
import express from 'express';
import connectDB from './config/db.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import redisClient from './config/redis.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

const app = express();

app.set('trust proxy', 1); // ✅ Trust first proxy hop (Docker gateway / Render's load balancer)

const PORT = process.env.PORT || 3001;

// 1. Global Middleware Layers
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'https://your-clinic-frontend.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (!process.env.FRONTEND_URL || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, true);
  },
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

// 3. 📖 Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Ethiopian Clinic - User Service Docs',
  swaggerOptions: {
    persistAuthorization: true
  }
}));

// 3. Asynchronous Database Initializer and Listener Launcher
async function start() {
  try {
    const { default: userRoutes } = await import('./routes/user.route.js');
    app.use('/api/users', userRoutes);

    // 404 Route Not Found Catch-All
    app.use(notFoundHandler);

    // Centralized Global Error Handler Middleware
    app.use(errorHandler);

    // 🚀 Start listening on PORT immediately so Render port scanner detects it right away
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Production microservice listening cleanly on address interface 0.0.0.0:${PORT}`);
      console.log(`📖 Swagger API Docs interactive UI available at: http://localhost:${PORT}/api-docs`);
    });

    // 🍃 Connect to MongoDB Atlas (with automatic retries if IP is being whitelisted)
    connectDB();

    if (redisClient) {
      try {
        if (!redisClient.isOpen) {
          await redisClient.connect();
          console.log('⚡ User Service connected to Redis store successfully!');
        }
      } catch (err) {
        console.error('❌ Redis Connection Error:', err);
        console.log('⚠️ Continuing boot cycle using fallback localized tracking arrays...');
      }
    } else {
      console.warn('⚠️ Redis is not configured. Set REDIS_URL to enable Redis caching/session storage.');
    }

    process.on('unhandledRejection', (err) => {
      console.error('🔥 UNHANDLED REJECTION! Shutting down gracefully...', err);
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (criticalBootError) {
    console.error('❌ CRITICAL ERROR DURING MICROSERVICE APP START:', criticalBootError);
    process.exit(1);
  }
}

start();