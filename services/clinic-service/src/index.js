import './config/loadEnv.js';
import path from 'path';
import express from 'express';
import connectDB from './config/db.js';
import cors from 'cors';
import helmet from 'helmet';
import { corsOptions } from './config/cors.js';
import cookieParser from 'cookie-parser';
import redisClient from './config/redis.js';
import clinicRoutes from './routes/clinic.routes.js';
import { createGeneralRateLimiter } from './middleware/rateLimiter.js';
import { initSlotCronScheduler, runDailySlotAllocation } from './cron/slotCron.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger.js';

const app = express();

app.set('trust proxy', 1); // Render / Docker sit behind one proxy hop (needed for correct client IPs in rate limiting)

// Security headers. CSP is disabled because this is a JSON API (and Swagger UI needs inline assets).
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));         // ✅ Parse JSON bodies on ALL routes
app.use(express.urlencoded({ extended: true, limit: '100kb' })); // ✅ Also parse form data

const PORT = process.env.PORT || process.env.CLINIC_PORT || 3002;
app.use(cors(corsOptions));

app.use(cookieParser());

// 📖 Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: "Ethiopian Clinic API Documentation - Clinic Service",
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true
  }
}));

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
  // Rate limit is built after the Redis connect attempt so it can use the shared Redis store
  app.use('/api/clinics', createGeneralRateLimiter(), clinicRoutes);

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      message: 'Clinic Service is alive and healthy!'
    });
  });

  // Centralized Error Handler (e.g. Multer file size limits or format errors)
  app.use((err, req, res, next) => {
    console.error('Clinic Service Error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum allowed file size is 5 MB.'
      });
    }
    return res.status(err.status || 400).json({
      success: false,
      message: err.message || 'An error occurred during request processing.'
    });
  });

  // Initialize cron scheduler for midnight automatic slot generation
  initSlotCronScheduler();

  // 🚀 Run slot generation immediately on startup so slots exist right away.
  runDailySlotAllocation(0); // today
  runDailySlotAllocation(1); // tomorrow

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`📖 Swagger API Docs interactive UI available at: http://localhost:${PORT}/api-docs`);
  });
}

start();
