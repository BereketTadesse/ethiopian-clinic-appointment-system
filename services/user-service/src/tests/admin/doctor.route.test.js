import request from 'supertest';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { connectDB, closeDB, clearDB } from '../setup/db.setup.js';

// Mock the clinic-service HTTP call made by the createDoctor controller
const axiosPost = jest.fn();
jest.unstable_mockModule('axios', () => ({
  default: { post: axiosPost, get: jest.fn(), patch: jest.fn(), put: jest.fn() }
}));

jest.unstable_mockModule('../../utils/send-email.js', () => ({
  default: jest.fn().mockResolvedValue(true)
}));

jest.unstable_mockModule('express-rate-limit', () => ({
  default: () => (req, res, next) => next()
}));

let app;
let User;

const tokenFor = (user) =>
  jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET, { expiresIn: '15m' });

const createUserWithRole = (role, email) =>
  User.create({
    name: `${role} user`,
    email,
    phoneNumber: `09${Math.floor(10000000 + Math.random() * 89999999)}`,
    address: 'Addis Ababa',
    password: 'hashed-not-used',
    gender: 'male',
    role,
    isVerified: true,
    isActive: true
  });

const validDoctor = {
  name: 'Dr. Selam Haile',
  email: 'selam.haile@clinic.et',
  phoneNumber: '0911777888',
  password: 'Doctor12345',
  gender: 'female',
  specialization: 'Pediatrics',
  licenseNumber: 'ETH-MED-2026-777',
  yearsOfExperience: 7,
  availableDays: ['Monday', 'Wednesday', 'Friday'],
  startTime: '08:30',
  endTime: '17:00',
  breakStart: '12:30',
  breakEnd: '13:30'
};

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  await connectDB();
  app = (await import('../setup/app.setup.js')).default;
  User = (await import('../../models/user-service.model.js')).default;
});

afterEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

afterAll(async () => {
  await closeDB();
});

describe('POST /api/users/admin/doctor', () => {
  it('admin creates a doctor account and clinic profile', async () => {
    const admin = await createUserWithRole('admin', 'admin@test.et');
    const adminToken = tokenFor(admin);
    axiosPost.mockResolvedValueOnce({ status: 201, data: { success: true, data: { specialization: 'Pediatrics' } } });

    const res = await request(app)
      .post('/api/users/admin/doctor')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validDoctor);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.user.role).toBe('doctor');
    expect(res.body.data.user.password).toBeUndefined();

    // Forwarded the clinic fields + new user id to clinic-service with the admin's token
    expect(axiosPost).toHaveBeenCalledTimes(1);
    const [url, body, config] = axiosPost.mock.calls[0];
    expect(url).toMatch(/\/api\/clinics\/createDoctorProfile$/);
    expect(body.userId).toBe(res.body.data.user._id);
    expect(body.licenseNumber).toBe(validDoctor.licenseNumber);
    expect(config.headers.Authorization).toBe(`Bearer ${adminToken}`);

    const saved = await User.findOne({ email: validDoctor.email });
    expect(saved.role).toBe('doctor');
    expect(saved.isVerified).toBe(true);
    expect(saved.password).not.toBe(validDoctor.password); // hashed
  });

  it('rolls back the user account if clinic-service rejects the profile', async () => {
    const admin = await createUserWithRole('admin', 'admin@test.et');
    axiosPost.mockRejectedValueOnce({
      response: { status: 400, data: { message: 'This medical license number is already registered.' } }
    });

    const res = await request(app)
      .post('/api/users/admin/doctor')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send(validDoctor);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/license number is already registered/);
    expect(await User.findOne({ email: validDoctor.email })).toBeNull();
  });

  it('returns 502 and rolls back when clinic-service is down', async () => {
    const admin = await createUserWithRole('admin', 'admin@test.et');
    axiosPost.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

    const res = await request(app)
      .post('/api/users/admin/doctor')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send(validDoctor);

    expect(res.statusCode).toBe(502);
    expect(await User.findOne({ email: validDoctor.email })).toBeNull();
  });

  it.each(['patient', 'doctor', 'receptionist'])('rejects a %s (403)', async (role) => {
    const user = await createUserWithRole(role, `${role}@test.et`);

    const res = await request(app)
      .post('/api/users/admin/doctor')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send(validDoctor);

    expect(res.statusCode).toBe(403);
    expect(axiosPost).not.toHaveBeenCalled();
  });

  it('rejects requests without a token (401)', async () => {
    const res = await request(app).post('/api/users/admin/doctor').send(validDoctor);
    expect(res.statusCode).toBe(401);
  });

  it('rejects an invalid shift (break outside working hours)', async () => {
    const admin = await createUserWithRole('admin', 'admin@test.et');

    const res = await request(app)
      .post('/api/users/admin/doctor')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ ...validDoctor, breakStart: '18:00', breakEnd: '19:00' });

    expect(res.statusCode).toBe(400);
    expect(axiosPost).not.toHaveBeenCalled();
  });

  it('rejects a duplicate email', async () => {
    const admin = await createUserWithRole('admin', 'admin@test.et');
    await createUserWithRole('patient', validDoctor.email);

    const res = await request(app)
      .post('/api/users/admin/doctor')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send(validDoctor);

    expect(res.statusCode).toBe(400);
    expect(axiosPost).not.toHaveBeenCalled();
  });
});

describe('Public registration cannot create doctors', () => {
  it('POST /register with role doctor is rejected', async () => {
    const res = await request(app).post('/api/users/register').send({
      name: 'Fake Doctor', email: 'fake.doc@test.et', password: 'Password123', phoneNumber: '0911000999',
      gender: 'male', address: 'Bole, Addis Ababa', role: 'doctor'
    });
    expect(res.statusCode).toBe(400);
    expect(await User.findOne({ email: 'fake.doc@test.et' })).toBeNull();
  });
});
