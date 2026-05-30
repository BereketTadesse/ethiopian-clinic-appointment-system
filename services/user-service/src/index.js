import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import userRoutes from './routes/user.route.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });


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
connectDB();

app.use(express.json());
app.use('/api/users', userRoutes);
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    message: 'User Service is alive and healthy!' 
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
