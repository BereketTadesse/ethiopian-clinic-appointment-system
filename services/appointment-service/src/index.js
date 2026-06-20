import express from 'express';
import cardRoutes from './routes/card.routes.js';
import appointmentRoutes from './routes/appointment.routes.js'; // 🚀 Import appointments router
import './config/loadEnv.js';
import connectDB from './config/db.js';
import redisClient from './config/redis.js';
import mongoose from 'mongoose';

const app = express();
app.use(express.json());

// Main App Mounted Enclave Route Allocations
app.use('/api/cards', cardRoutes);
app.use('/api/appointments', appointmentRoutes); // 🚀 Mount the appointments route 

const PORT = process.env.PORT || 3003;
let server;

const startServer = async () => {
	try {
		await connectDB();

		if (redisClient) {
			try {
				await redisClient.connect();
				console.log('☁️ Appointment Service connected to Redis');
			} catch (rErr) {
				console.error('❌ Redis connection failed:', rErr.message || rErr);
				process.exit(1);
			}
		} else {
			console.log('ℹ️ No Redis configured for this service (REDIS_URL not set)');
		}

		server = app.listen(PORT, () => {
			console.log(`Appointment service listening on port ${PORT}`);
		});
	} catch (err) {
		console.error('Startup failed:', err);
		process.exit(1);
	}
};

startServer();

export default app;

const shutdown = async (signal) => {
	console.log(`Received ${signal}, shutting down...`);
	try {
		if (server) server.close();
		if (redisClient && redisClient.isOpen) await redisClient.disconnect();
		if (mongoose.connection && mongoose.connection.readyState === 1) await mongoose.connection.close();
		process.exit(0);
	} catch (err) {
		console.error('Error during shutdown:', err);
		process.exit(1);
	}
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
	console.error('Unhandled Rejection:', err);
	shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
	console.error('Uncaught Exception:', err);
	shutdown('uncaughtException');
});