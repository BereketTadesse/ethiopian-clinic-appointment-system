import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const {
  USER_SERVICE_MONGO_URI,
  CLINIC_SERVICE_MONGO_URI,
  APPOINTMENT_SERVICE_MONGO_URI
} = process.env;

if (!USER_SERVICE_MONGO_URI || !CLINIC_SERVICE_MONGO_URI) {
  console.error('❌ Missing USER_SERVICE_MONGO_URI or CLINIC_SERVICE_MONGO_URI in .env');
  process.exit(1);
}

// -------------------------------------------------------------
// Helper: 40-Minute Slot Generator
// -------------------------------------------------------------
const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (min) => {
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
};

const generateSlots = (doctorId, date, startTime, endTime, breakStart, breakEnd) => {
  const slots = [];
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const bStartMin = breakStart ? timeToMinutes(breakStart) : null;
  const bEndMin = breakEnd ? timeToMinutes(breakEnd) : null;

  let currentMin = startMin;
  while (currentMin + 40 <= endMin) {
    const slotStart = currentMin;
    const slotEnd = currentMin + 40;

    // Skip lunch break
    if (bStartMin !== null && bEndMin !== null) {
      if (slotStart < bEndMin && slotEnd > bStartMin) {
        currentMin = bEndMin;
        continue;
      }
    }

    slots.push({
      doctorId,
      date,
      startTime: minutesToTime(slotStart),
      endTime: minutesToTime(slotEnd),
      status: 'available'
    });

    currentMin += 40;
  }
  return slots;
};

const getTargetDates = () => {
  const dates = [];
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let offset = 0; offset <= 2; offset++) {
    const d = new Date();
    // UTC+3 Addis Ababa
    const target = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + (3 * 3600000));
    target.setDate(target.getDate() + offset);

    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');

    dates.push({
      dateString: `${year}-${month}-${day}`,
      dayName: daysOfWeek[target.getDay()]
    });
  }
  return dates;
};

// -------------------------------------------------------------
// Main Migration & Seed Runner
// -------------------------------------------------------------
async function runMigration() {
  console.log('🚀 Starting Ethiopian Clinic Appointment System database migration & seeding...\n');

  // ============================================================
  // 1. SEED USER SERVICE DATABASE (clinic_user_db)
  // ============================================================
  console.log('📡 [1/3] Connecting to User Service Database (clinic_user_db)...');
  const userConn = await mongoose.createConnection(USER_SERVICE_MONGO_URI).asPromise();
  console.log('✅ Connected to clinic_user_db');

  const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    birthDate: { type: Date },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
    address: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false }
  }, { timestamps: true });

  const User = userConn.model('User', UserSchema);

  // Hash passwords
  const salt = await bcrypt.genSalt(10);
  const adminPass = await bcrypt.hash('Admin@123456', salt);
  const doctorPass = await bcrypt.hash('Doctor@123456', salt);
  const patientPass = await bcrypt.hash('Patient@123456', salt);

  console.log('🌱 Seeding initial user accounts...');

  const admin = await User.findOneAndUpdate(
    { email: 'admin@clinic.et' },
    {
      name: 'System Administrator',
      email: 'admin@clinic.et',
      password: adminPass,
      phoneNumber: '+251911000001',
      gender: 'male',
      role: 'admin',
      address: 'Bole, Addis Ababa',
      isActive: true,
      isVerified: true
    },
    { upsert: true, new: true }
  );
  console.log(`   👑 Admin User Ready: admin@clinic.et (ID: ${admin._id})`);

  const doctorUser = await User.findOneAndUpdate(
    { email: 'doctor.abebe@clinic.et' },
    {
      name: 'Dr. Abebe Bekele',
      email: 'doctor.abebe@clinic.et',
      password: doctorPass,
      phoneNumber: '+251911000002',
      gender: 'male',
      role: 'doctor',
      address: 'Kirkos, Addis Ababa',
      isActive: true,
      isVerified: true
    },
    { upsert: true, new: true }
  );
  console.log(`   🩺 Doctor User Ready: doctor.abebe@clinic.et (ID: ${doctorUser._id})`);

  const patientUser = await User.findOneAndUpdate(
    { email: 'patient.almaz@gmail.com' },
    {
      name: 'Almaz Kebede',
      email: 'patient.almaz@gmail.com',
      password: patientPass,
      phoneNumber: '+251911000003',
      gender: 'female',
      role: 'patient',
      address: 'Yeka, Addis Ababa',
      isActive: true,
      isVerified: true
    },
    { upsert: true, new: true }
  );
  console.log(`   🧑 Patient User Ready: patient.almaz@gmail.com (ID: ${patientUser._id})`);

  // ============================================================
  // 2. SEED CLINIC SERVICE DATABASE (clinic_clinic_db)
  // ============================================================
  console.log('\n📡 [2/3] Connecting to Clinic Service Database (clinic_clinic_db)...');
  const clinicConn = await mongoose.createConnection(CLINIC_SERVICE_MONGO_URI).asPromise();
  console.log('✅ Connected to clinic_clinic_db');

  const ClinicSchema = new mongoose.Schema({
    name: { type: String, default: 'Selam General Clinic' },
    description: String,
    phoneNumber: { type: String, required: true },
    email: String,
    website: String,
    location: {
      city: { type: String, default: 'Addis Ababa' },
      subCity: String,
      woreda: String,
      fullAddress: String,
      coordinates: { latitude: Number, longitude: Number }
    },
    workingHours: {
      openDays: [String],
      openTime: String,
      closeTime: String
    },
    services: [String]
  }, { timestamps: true });

  const DoctorSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    specialization: { type: String, required: true },
    licenseNumber: { type: String, required: true, unique: true },
    yearsOfExperience: { type: Number, default: 0 },
    bio: String,
    availableDays: [String],
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    breakStart: String,
    breakEnd: String,
    isAcceptingPatients: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true }
  }, { timestamps: true });

  const SlotSchema = new mongoose.Schema({
    doctorId: { type: String, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: { type: String, enum: ['available', 'reserved', 'booked', 'cancelled', 'blocked'], default: 'available' },
    appointmentId: String
  }, { timestamps: true });

  SlotSchema.index({ doctorId: 1, date: 1, startTime: 1 }, { unique: true });

  const Clinic = clinicConn.model('Clinic', ClinicSchema);
  const Doctor = clinicConn.model('Doctor', DoctorSchema);
  const Slot = clinicConn.model('Slot', SlotSchema);

  console.log('🌱 Seeding Clinic facility master data...');
  const clinic = await Clinic.findOneAndUpdate(
    {},
    {
      name: 'Selam General Clinic (ሰላም ጠቅላላ ክሊኒክ)',
      description: 'Comprehensive outpatient care, digital patient archiving, and specialist consultations.',
      phoneNumber: '+251116612233',
      email: 'reception@selamclinic.et',
      location: {
        city: 'Addis Ababa',
        subCity: 'Bole',
        woreda: 'Woreda 03',
        fullAddress: 'Bole Medhanialem, Behind Edna Mall, Addis Ababa'
      },
      workingHours: {
        openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        openTime: '08:00',
        closeTime: '17:30'
      },
      services: ['General Medicine', 'Pediatrics', 'Obstetrics & Gynecology', 'Dental Care', 'Clinical Laboratory']
    },
    { upsert: true, new: true }
  );
  console.log(`   🏥 Clinic Profile Established: "${clinic.name}"`);

  console.log('🌱 Linking Doctor shift profile to Dr. Abebe Bekele...');
  const doctorShift = await Doctor.findByIdAndUpdate(
    doctorUser._id.toString(),
    {
      _id: doctorUser._id.toString(),
      specialization: 'General Practitioner',
      licenseNumber: 'ETH-DOC-2026-0042',
      yearsOfExperience: 8,
      bio: 'Experienced General Practitioner specializing in outpatient consultations, family medicine, and triage.',
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      startTime: '08:30',
      endTime: '17:30',
      breakStart: '12:30',
      breakEnd: '13:30',
      isAcceptingPatients: true,
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log(`   🩺 Doctor Profile Linked: Specialization in ${doctorShift.specialization} (${doctorShift.startTime} - ${doctorShift.endTime})`);

  console.log('⏰ Generating 40-minute consultation slots for upcoming days...');
  const targetDays = getTargetDates();
  let totalSlotsCreated = 0;

  for (const { dateString, dayName } of targetDays) {
    if (doctorShift.availableDays.includes(dayName)) {
      const slots = generateSlots(
        doctorShift._id,
        dateString,
        doctorShift.startTime,
        doctorShift.endTime,
        doctorShift.breakStart,
        doctorShift.breakEnd
      );

      for (const slotData of slots) {
        await Slot.updateOne(
          { doctorId: slotData.doctorId, date: slotData.date, startTime: slotData.startTime },
          { $setOnInsert: slotData },
          { upsert: true }
        );
      }
      totalSlotsCreated += slots.length;
      console.log(`   📅 ${dateString} (${dayName}): ${slots.length} slots generated (Lunch: 12:30-13:30 preserved)`);
    }
  }

  // ============================================================
  // 3. APPOINTMENT SERVICE DATABASE (clinic_appointment_db)
  // ============================================================
  if (APPOINTMENT_SERVICE_MONGO_URI) {
    console.log('\n📡 [3/3] Connecting to Appointment Service Database (clinic_appointment_db)...');
    const apptConn = await mongoose.createConnection(APPOINTMENT_SERVICE_MONGO_URI).asPromise();
    console.log('✅ Connected to clinic_appointment_db');

    const PatientCardSchema = new mongoose.Schema({
      patientId: { type: String, required: true },
      cardNumber: { type: String, required: true }
    });
    apptConn.model('PatientCard', PatientCardSchema);
    console.log('   📇 Appointment Service schema & indexes initialized.');
    await apptConn.close();
  }

  await userConn.close();
  await clinicConn.close();

  console.log('\n🎉 =========================================================');
  console.log('   DATABASE MIGRATION & SEEDING COMPLETED SUCCESSFULLY!');
  console.log('   =========================================================');
  console.log('   Credentials Created:');
  console.log('   1. 👑 Admin:   admin@clinic.et          / Admin@123456');
  console.log('   2. 🩺 Doctor:  doctor.abebe@clinic.et   / Doctor@123456');
  console.log('   3. 🧑 Patient: patient.almaz@gmail.com  / Patient@123456');
  console.log(`   Slots Created: ${totalSlotsCreated} available slots across today and upcoming days.`);
  console.log('   =========================================================\n');
}

runMigration().catch((err) => {
  console.error('\n❌ Migration failed with error:', err);
  process.exit(1);
});
