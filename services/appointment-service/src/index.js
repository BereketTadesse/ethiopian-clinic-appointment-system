import './config/loadEnv.js';
import mongoose from 'mongoose';
import app from './app.js';
import connectDB from './config/db.js';
import redisClient from './config/redis.js';
import { initRateLimiters } from './middleware/rateLimiter.js';
import { runStartupMigrations } from './config/migrations.js';

const PORT = process.env.PORT || 3003;
let server;
let shuttingDown = false;

const startServer = async () => {
  try {
    await connectDB();
    await runStartupMigrations();

    if (redisClient) {
      try {
        await redisClient.connect();
        console.log('☁️ Appointment Service connected to Redis');
      } catch (rErr) {
        // Redis is optional here: rate limiting falls back to an in-memory store.
        console.error('❌ Redis connection failed, continuing without it:', rErr.message || rErr);
      }
    } else {
      console.log('ℹ️ No Redis configured for this service (REDIS_URL not set)');
    }

    initRateLimiters();

    server = app.listen(PORT, () => {
      console.log(`Appointment service listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
};

/**
 * Graceful shutdown: stop accepting connections, let in-flight requests finish,
 * close Redis/Mongo, then exit. Forced exit after 10s if something hangs.
 */
const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down gracefully...`);
  setTimeout(() => process.exit(exitCode || 1), 10_000).unref();
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (redisClient?.isOpen) await redisClient.quit();
    if (mongoose.connection.readyState === 1) await mongoose.connection.close();
  } catch (err) {
    console.error('Error during shutdown:', err);
    exitCode = 1;
  }
  process.exit(exitCode);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// A stray rejected promise is a bug to log and fix, not a reason to take every booking offline.
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled promise rejection (service kept running):', reason);
});

// After an uncaught exception the process state is unknown: exit cleanly so the platform restarts it.
process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught exception, restarting:', err);
  shutdown('uncaughtException', 1);
});

startServer();
