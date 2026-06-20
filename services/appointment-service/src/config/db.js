import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();



const connectDB = async () =>{
try {
    // 🍃 Read the Appointment Service specific MongoDB URI
    const conn = await mongoose.connect(process.env.APPOINTMENT_SERVICE_MONGO_URI);
    
    console.log(`☁️ Appointment Service connected to Cloud MongoDB Atlas: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Appointment Service Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;