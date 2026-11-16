import request from 'supertest';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectDB, closeDB, clearDB } from '../setup/db.setup.js';

const axiosPatch = jest.fn();
jest.unstable_mockModule('axios', () => ({
  default: { post: jest.fn(), get: jest.fn(), patch: axiosPatch, put: jest.fn(), delete: jest.fn() }
}));
jest.unstable_mockModule('../../utils/send-email.js', () => ({ default: jest.fn().mockResolvedValue(true) }));
jest.unstable_mockModule('express-rate-limit', () => ({ default: () => (req, res, next) => next() }));

let app;
let User;
const PASSWORD = 'Password123';

const tokenFor = (user) =>
  jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET, { expiresIn: '15m' });

let phoneSeq = 10000000;
const makeUser = async (role, email, extra = {}) =>
  User.create({
    name: `${role} user`,
    email,
    phoneNumber: `09${phoneSeq++}`,
    address: 'Addis Ababa',
    password: await bcrypt.hash(PASSWORD, 4),
    gender: 'male',
    role,
    isVerified: true,
    isActive: true,
    ...extra
  });

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  process.env.INTERNAL_SERVICE_SECRET = 'test-internal-secret';
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

describe('A. Profile privacy (GET /profile/:id)', () => {
  it('a patient cannot read another patient\'s profile', async () => {
    const alice = await makeUser('patient', 'alice@test.et');
    const bob = await makeUser('patient', 'bob@test.et');
    const res = await request(app).get(`/api/users/profile/${bob._id}`).set('Authorization', `Bearer ${tokenFor(alice)}`);
    expect(res.statusCode).toBe(403);
  });

  it('a patient can read their own profile', async () => {
    const alice = await makeUser('patient', 'alice@test.et');
    const res = await request(app).get(`/api/users/profile/${alice._id}`).set('Authorization', `Bearer ${tokenFor(alice)}`);
    expect(res.statusCode).toBe(200);
  });

  it.each(['doctor', 'receptionist', 'admin'])('a %s can read a patient profile', async (role) => {
    const patient = await makeUser('patient', 'p@test.et');
    const staff = await makeUser(role, `${role}@test.et`);
    const res = await request(app).get(`/api/users/profile/${patient._id}`).set('Authorization', `Bearer ${tokenFor(staff)}`);
    expect(res.statusCode).toBe(200);
  });
});

describe('B. Doctor account deletion (DELETE /delete-me)', () => {
  it('deactivates the clinic profile via the internal endpoint, then deletes the user', async () => {
    const doctor = await makeUser('doctor', 'doc@test.et');
    axiosPatch.mockResolvedValueOnce({ status: 200, data: { success: true } });

    const res = await request(app).delete('/api/users/delete-me')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`).send({ password: PASSWORD });

    expect(res.statusCode).toBe(200);
    const [url, , config] = axiosPatch.mock.calls[0];
    expect(url).toMatch(new RegExp(`/api/clinics/internal/doctors/${doctor._id}/deactivate$`));
    expect(config.headers['x-internal-service-secret']).toBe('test-internal-secret');
    expect(config.headers.Authorization).toBeUndefined(); // no forged admin token
    expect(await User.findById(doctor._id)).toBeNull();
  });

  it('keeps the account if clinic-service cannot deactivate the doctor', async () => {
    const doctor = await makeUser('doctor', 'doc@test.et');
    axiosPatch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await request(app).delete('/api/users/delete-me')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`).send({ password: PASSWORD });

    expect(res.statusCode).toBe(502);
    expect(await User.findById(doctor._id)).not.toBeNull();
  });
});

describe('C. Debug routes removed', () => {
  it.each([['get', '/api/users/test-tokens'], ['get', '/api/users/check-refresh-token'], ['post', '/api/users/check-refresh-token']])(
    '%s %s -> 404', async (method, path) => {
      const res = await request(app)[method](path);
      expect(res.statusCode).toBe(404);
    }
  );
});

describe('E. Verification link', () => {
  it('uses USER_SERVICE_PUBLIC_URL instead of localhost', async () => {
    process.env.USER_SERVICE_PUBLIC_URL = 'https://users.example.com';
    const sendEmail = (await import('../../utils/send-email.js')).default;
    const res = await request(app).post('/api/users/register').send({
      name: 'New Patient', email: 'new@test.et', password: PASSWORD, phoneNumber: '0911999000', gender: 'female', address: 'Bole, Addis Ababa'
    });
    delete process.env.USER_SERVICE_PUBLIC_URL;
    expect(res.statusCode).toBe(201);
    const html = sendEmail.mock.calls[0][2];
    expect(html).toContain('https://users.example.com/api/users/verify/');
    expect(html).not.toContain('localhost:3001');
  });
});

describe('K. Deactivated accounts', () => {
  it('cannot log in', async () => {
    await makeUser('patient', 'off@test.et', { isActive: false });
    const res = await request(app).post('/api/users/login').send({ email: 'off@test.et', password: PASSWORD });
    expect(res.statusCode).toBe(403);
    expect(res.body.accessToken).toBeUndefined();
  });

  it('an existing token stops working once the account is deactivated', async () => {
    const user = await makeUser('patient', 'p@test.et');
    const token = tokenFor(user);
    await User.updateOne({ _id: user._id }, { isActive: false });
    const res = await request(app).get(`/api/users/profile/${user._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });
});

describe('Admin status endpoint (PATCH /admin/update-user-status/:id)', () => {
  it('accepts { isActive } (the payload clinic-service sends) and clears the refresh token', async () => {
    const admin = await makeUser('admin', 'admin@test.et');
    const doctor = await makeUser('doctor', 'doc@test.et', { refreshToken: 'some-refresh-token' });

    const res = await request(app).patch(`/api/users/admin/update-user-status/${doctor._id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`).send({ isActive: false });

    expect(res.statusCode).toBe(200);
    const saved = await User.findById(doctor._id);
    expect(saved.isActive).toBe(false);
    expect(saved.refreshToken).toBeFalsy(); // cleared (null/undefined) -> session cannot be refreshed
  });

  it('ignores role changes (cannot promote a patient to admin)', async () => {
    const admin = await makeUser('admin', 'admin@test.et');
    const patient = await makeUser('patient', 'p@test.et');

    await request(app).patch(`/api/users/admin/update-user-status/${patient._id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`).send({ isActive: true, role: 'admin' });

    expect((await User.findById(patient._id)).role).toBe('patient');
  });

  it('the admin cannot deactivate their own account', async () => {
    const admin = await makeUser('admin', 'admin@test.et');
    const res = await request(app).patch(`/api/users/admin/update-user-status/${admin._id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`).send({ isActive: false });
    expect(res.statusCode).toBe(400);
    expect((await User.findById(admin._id)).isActive).toBe(true);
  });
});

describe('F. CORS allow-list', () => {
  it('only allows configured origins', async () => {
    const { getAllowedOrigins } = await import('../../config/cors.js');
    const prev = { url: process.env.FRONTEND_URL, env: process.env.NODE_ENV };
    process.env.FRONTEND_URL = 'https://clinic.example.com, https://admin.example.com/';
    process.env.NODE_ENV = 'production';
    const origins = getAllowedOrigins();
    process.env.FRONTEND_URL = prev.url;
    process.env.NODE_ENV = prev.env;
    expect(origins).toEqual(['https://clinic.example.com', 'https://admin.example.com']);
  });
});
