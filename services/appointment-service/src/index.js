import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import loadEnv from './config/loadEnv.js';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import appointmentRoutes from './routes/appointment.routes.js';

loadEnv();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/appointments', appointmentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'appointment-service' });
});

// Initialize connections and start server
const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    
    const PORT = process.env.PORT || 5002;
    app.listen(PORT, () => {
      console.log(`Appointment service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
