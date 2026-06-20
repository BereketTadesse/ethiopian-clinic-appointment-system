import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Slot from './models/slot.model.js'; 

// 🎯 Resolve the absolute path to your root .env file
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

// Quick safety log check
console.log('🔍 Extracted URI String:', process.env.CLINIC_SERVICE_MONGO_URI);

const seedSlots = async () => {
  try {
    // 1. Connect to your database
    await mongoose.connect(process.env.CLINIC_SERVICE_MONGO_URI);
    console.log('🐘 Connected to MongoDB for slot seeding...');

    // 2. Clear out any old lingering data (just in case)
    await Slot.deleteMany({});

    // 3. Define a real test doctor ID and target date
    // Use this exact doctor ID string when testing your route in Postman!
    const testDoctorId = '65f1a2b3c4d5e6f7a8b9c001'; 
    const targetDate = '2026-06-18';

    // 4. Build an array of 40-minute available slots
    const dummySlots = [
      {
        doctorId: testDoctorId,
        date: targetDate,
        startTime: '08:00',
        endTime: '08:40',
        status: 'available',
        appointmentId: null
      },
      {
        doctorId: testDoctorId,
        date: targetDate,
        startTime: '08:40',
        endTime: '09:20',
        status: 'available',
        appointmentId: null
      },
      {
        doctorId: testDoctorId,
        date: targetDate,
        startTime: '09:20',
        endTime: '10:00',
        status: 'available',
        appointmentId: null
      },
      {
        doctorId: testDoctorId,
        date: targetDate,
        startTime: '10:00',
        endTime: '10:40',
        status: 'available',
        appointmentId: null
      }
    ];

    // 5. Insert into MongoDB Atlas
    await Slot.insertMany(dummySlots);
    console.log('🎉 Successfully seeded 4 available 40-minute slots into Atlas!');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedSlots();