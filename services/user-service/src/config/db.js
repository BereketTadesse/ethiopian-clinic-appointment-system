import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();



const connectDB = async () => {
  try {
    const mongoUri = process.env.USER_SERVICE_MONGO_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('Missing MongoDB URI: Please set USER_SERVICE_MONGO_URI or MONGO_URI in your Render environment variables.');
    }
    const conn = await mongoose.connect(mongoUri);
    console.log(`☁️ User Service connected to Cloud MongoDB Atlas: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ User Service Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;