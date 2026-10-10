import express from 'express';
import cookieParser from 'cookie-parser';
import userRoutes from '../../routes/user.route.js';

// We create a fresh Express app specifically for testing to avoid 
// port conflicts and running the actual production server initialization.
const app = express();

app.use(cookieParser());
app.use(express.json());

// Mount the routes we want to test
app.use('/api/users', userRoutes);

export default app;
