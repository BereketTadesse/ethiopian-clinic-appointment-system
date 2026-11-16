import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import userRoutes from '../../routes/user.route.js';
import { errorHandler } from '../../middleware/error.middleware.js';

// Wait for Mongoose's background index builds to finish before any test runs.
// Otherwise the first transactional write (e.g. register) can collide with an
// in-progress index build on the fresh in-memory replica set and fail with a 500.
await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

// We create a fresh Express app specifically for testing to avoid 
// port conflicts and running the actual production server initialization.
const app = express();

app.use(cookieParser());
app.use(express.json());

// Mount the routes we want to test
app.use('/api/users', userRoutes);

// Centralized Global Error Handler Middleware
app.use(errorHandler);

export default app;

