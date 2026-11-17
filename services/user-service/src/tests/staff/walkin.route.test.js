import request from 'supertest';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { connectDB, closeDB, clearDB } from '../setup/db.setup.js';

jest.unstable_mockModule('../../utils/send-email.js', () => ({ default: jest.fn().mockResolvedValue(true) }));
jest.unstable_mockModule('express-rate-limit', () => ({ default: () => (req, res, next) => next() }));

let app, User;
let seq = 0;

const makeUser = (role, extra = {}) => User.create({
  name: `${role} ${++seq}`, email: `${role}${seq}@test.et`, phoneNumber: `09110000${String(seq).padStart(2, '0')}`,
  address: 'Addis Ababa', password: 'x', gender: 'female', role, isVerified: true, ...extra
});
const auth = (user) => `Bearer ${jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET)}`;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  await connectDB();
  app = (await import('../setup/app.setup.js')).default;
  User = (await import('../../models/user-service.model.js')).default;
});
afterEach(async () => { await clearDB(); });
afterAll(async () => { await closeDB(); });

describe('GET /api/users/staff/patients (front desk search)', () => {
  it('finds patients by name or phone (ignoring spaces), never staff', async () => {
    const reception = await makeUser('receptionist');
    await makeUser('patient', { name: 'Almaz Tesfaye', phoneNumber: '0911223344' });
    await makeUser('doctor', { name: 'Almaz Doctor' });

    const byName = await request(app).get('/api/users/staff/patients?search=almaz').set('Authorization', auth(reception));
    const byPhone = await request(app).get('/api/users/staff/patients?search=0911 22 33 44').set('Authorization', auth(reception));

    expect(byName.statusCode).toBe(200);
    expect(byName.body.data.map((p) => p.name)).toEqual(['Almaz Tesfaye']);
    expect(byPhone.body.data).toHaveLength(1);
    expect(byName.body.data[0].password).toBeUndefined();
  });

  it('treats regex characters literally', async () => {
    const reception = await makeUser('receptionist');
    await makeUser('patient', { name: 'Abebe' });
    const res = await request(app).get('/api/users/staff/patients?search=.*').set('Authorization', auth(reception));
    expect(res.body.data).toHaveLength(0);
  });

  it('patients and doctors cannot search (403)', async () => {
    for (const role of ['patient', 'doctor']) {
      const u = await makeUser(role);
      const res = await request(app).get('/api/users/staff/patients?search=ab').set('Authorization', auth(u));
      expect(res.statusCode).toBe(403);
    }
  });
});

describe('POST /api/users/staff/patients (register walk-in)', () => {
  it('registers a walk-in without email; placeholder email is never returned', async () => {
    const reception = await makeUser('receptionist');

    const res = await request(app).post('/api/users/staff/patients').set('Authorization', auth(reception))
      .send({ name: 'Walk In', phoneNumber: '0922000111', gender: 'male' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.email).toBeNull();
    const saved = await User.findById(res.body.data._id);
    expect(saved).toMatchObject({ role: 'patient', isVerified: true });
    expect(saved.email).toMatch(/@walkin\.caresync\.local$/);

    const found = await request(app).get('/api/users/staff/patients?search=Walk').set('Authorization', auth(reception));
    expect(found.body.data[0].email).toBeNull();
  });

  it('returns the existing patient (409) instead of creating a duplicate phone number', async () => {
    const reception = await makeUser('receptionist');
    const existing = await makeUser('patient', { phoneNumber: '0933000222' });

    const res = await request(app).post('/api/users/staff/patients').set('Authorization', auth(reception))
      .send({ name: 'Someone', phoneNumber: '0933000222', gender: 'female' });

    expect(res.statusCode).toBe(409);
    expect(res.body.data._id).toBe(String(existing._id));
  });

  it('can never create a staff account (role is always patient)', async () => {
    const admin = await makeUser('admin');
    const res = await request(app).post('/api/users/staff/patients').set('Authorization', auth(admin))
      .send({ name: 'Sneaky', phoneNumber: '0944000333', gender: 'male', role: 'admin' });
    expect(res.statusCode).toBe(201);
    expect((await User.findById(res.body.data._id)).role).toBe('patient');
  });

  it('patients cannot register walk-ins (403)', async () => {
    const patient = await makeUser('patient');
    const res = await request(app).post('/api/users/staff/patients').set('Authorization', auth(patient))
      .send({ name: 'X Y', phoneNumber: '0955000444', gender: 'male' });
    expect(res.statusCode).toBe(403);
  });
});
