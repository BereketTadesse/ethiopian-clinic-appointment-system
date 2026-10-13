import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (retries = 10, delay = 5000) => {
  const mongoUri = process.env.USER_SERVICE_MONGO_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ Critical: USER_SERVICE_MONGO_URI is not set in Render environment variables!');
    return false;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000
      });
      console.log(`☁️ User Service successfully connected to MongoDB Atlas: ${conn.connection.host}`);
      return true;
    } catch (error) {
      console.error(`❌ MongoDB Connection Attempt ${attempt}/${retries} failed: ${error.message}`);
      if (
        error.message.includes('whitelist') ||
        error.message.includes('Could not connect to any servers') ||
        error.message.includes('ETIMEDOUT')
      ) {
        console.error('👉 ACTION REQUIRED IN MONGODB ATLAS:');
        console.error('   1. Log into https://cloud.mongodb.com');
        console.error('   2. Go to Security -> Network Access');
        console.error('   3. Click "+ Add IP Address" and select "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0)');
        console.error('   4. Click Confirm. MongoDB Atlas will apply it in ~1 minute.');
      }
      if (attempt < retries) {
        console.log(`⏳ Retrying MongoDB connection in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  console.warn('⚠️ MongoDB connection could not be established yet. Waiting for IP whitelist to be updated in Atlas...');
  return false;
};

export default connectDB;