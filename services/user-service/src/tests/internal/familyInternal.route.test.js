import request from 'supertest';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { connectDB, closeDB, clearDB } from '../setup/db.setup.js';

jest.unstable_mockModule('../../utils/send-email.js', () => ({ default: jest.fn().mockResolvedValue(true) }));
jest.unstable_mockModule('express-rate-limit', () => ({ default: () => (req, res, next) => next() }));

let app, User, FamilyMember, FamilyMemberProfile;
const SECRET = 'test-internal-secret';

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  process.env.INTERNAL_SERVICE_SECRET = SECRET;
  await connectDB();
  app = (await import('../setup/app.setup.js')).default;
  User = (await import('../../models/user-service.model.js')).default;
  FamilyMember = (await import('../../models/family_members.model.js')).default;
  FamilyMemberProfile = (await import('../../models/family_member_profile.model.js')).default;
});

afterEach(async () => { await clearDB(); });
afterAll(async () => { await closeDB(); });

const seed = async () => {
  const parent = await User.create({
    name: 'Almaz', email: 'almaz@test.et', phoneNumber: '0911000111', address: 'Addis Ababa',
    password: 'x', gender: 'female', role: 'patient', isVerified: true
  });
  const child = await FamilyMember.create({
    accountId: parent._id, fullName: 'Dawit', dateOfBirth: '2015-01-01', gender: 'male', relationship: 'son'
  });
  await FamilyMemberProfile.create({ familyMemberId: child._id, bloodType: 'A-', allergies: ['Peanuts'] });
  return { parent, child };
};

describe('GET /api/users/internal/family-members/:id', () => {
  it('returns the member, its account and its own medical profile with the internal secret', async () => {
    const { parent, child } = await seed();

    const res = await request(app).get(`/api/users/internal/family-members/${child._id}`).set('x-internal-service-secret', SECRET);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      fullName: 'Dawit', relationship: 'son', accountId: String(parent._id), isActive: true,
      profile: { bloodType: 'A-', allergies: ['Peanuts'] }
    });
  });

  it('rejects a user token without the secret (403)', async () => {
    const { parent, child } = await seed();
    const token = jwt.sign({ userId: parent._id, role: 'admin' }, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET);

    const res = await request(app).get(`/api/users/internal/family-members/${child._id}`).set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });

  it('404 for unknown or malformed ids', async () => {
    const unknown = await request(app).get('/api/users/internal/family-members/6a0000000000000000000000').set('x-internal-service-secret', SECRET);
    const malformed = await request(app).get('/api/users/internal/family-members/nope').set('x-internal-service-secret', SECRET);
    expect([unknown.statusCode, malformed.statusCode]).toEqual([404, 404]);
  });
});
