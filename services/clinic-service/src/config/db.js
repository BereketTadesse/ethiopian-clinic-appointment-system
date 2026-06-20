import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();



const connectDB = async () =>{
try {
    // 🍃 Read the Clinic Service specific MongoDB URI
    const conn = await mongoose.connect(process.env.CLINIC_SERVICE_MONGO_URI);
    
    console.log(`☁️ Clinic Service connected to Cloud MongoDB Atlas: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Clinic Service Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;