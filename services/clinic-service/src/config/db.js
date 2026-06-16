import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();



const connectDB = async () =>{
try {
    // 🍃 Updated to read the specific User Service variable name!
    const conn = await mongoose.connect(process.env.USER_SERVICE_MONGO_URI);
    
    console.log(`☁️ User Service connected to Cloud MongoDB Atlas: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ User Service Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;