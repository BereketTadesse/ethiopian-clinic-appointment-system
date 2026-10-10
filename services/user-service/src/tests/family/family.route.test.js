import request from 'supertest';
import { jest } from '@jest/globals';
import { connectDB, closeDB, clearDB } from '../setup/db.setup.js';

// Mock dependencies
jest.unstable_mockModule('../../utils/send-email.js', () => ({
  default: jest.fn().mockResolvedValue(true)
}));

jest.unstable_mockModule('express-rate-limit', () => ({
  default: () => (req, res, next) => next()
}));

let app;
let User;
let FamilyMember;
let FamilyMemberProfile;

beforeAll(async () => {
  // Set required env vars for testing
  process.env.JWT_SECRET = 'test_jwt_secret';
  process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  await connectDB();
  
  const appModule = await import('../setup/app.setup.js');
  app = appModule.default;

  const userModule = await import('../../models/user-service.model.js');
  User = userModule.default;

  const familyModule = await import('../../models/family_members.model.js');
  FamilyMember = familyModule.default;

  const familyProfileModule = await import('../../models/family_member_profile.model.js');
  FamilyMemberProfile = familyProfileModule.default;
});

afterEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

afterAll(async () => {
  await closeDB();
});

describe('Family Member Endpoints', () => {
  let userToken;
  let userId;

  const validUser = {
    name: 'Parent User',
    email: 'parent@clinic.com',
    phoneNumber: '+251911223344',
    address: 'Bole, Addis Ababa',
    password: 'Password123!',
    gender: 'male',
    role: 'patient'
  };

  beforeEach(async () => {
    // Register and Verify User
    await request(app).post('/api/users/register').send(validUser);
    const userDoc = await User.findOneAndUpdate({ email: validUser.email }, { isVerified: true }, { new: true });
    userId = userDoc._id.toString();

    // Login
    const loginRes = await request(app).post('/api/users/login').send({
      email: validUser.email,
      password: validUser.password
    });
    userToken = loginRes.body.accessToken;
  });

  describe('Core Family Member Operations', () => {
    it('should create a new family member', async () => {
      const res = await request(app)
        .post('/api/users/createFamilyMember')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          fullName: 'Child User',
          gender: 'female',
          dateOfBirth: '2015-05-15',
          relationship: 'daughter'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.member.fullName).toBe('Child User');
    });

    it('should get all family members for the user', async () => {
      // Create a member first
      await request(app)
        .post('/api/users/createFamilyMember')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fullName: 'Child User', gender: 'female', dateOfBirth: '2015-05-15', relationship: 'daughter' });

      const res = await request(app)
        .get('/api/users/getAllFamilyMembers')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body.members)).toBe(true);
      expect(res.body.members.length).toBeGreaterThan(0);
      expect(res.body.members.some(m => m.fullName === 'Child User')).toBe(true);
    });
    
    it('should update a family member', async () => {
      // Create member
      const createRes = await request(app)
        .post('/api/users/createFamilyMember')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fullName: 'Child User', gender: 'female', dateOfBirth: '2015-05-15', relationship: 'daughter' });
      
      const memberId = createRes.body.member._id;

      // Update member
      const updateRes = await request(app)
        .patch(`/api/users/updateFamilyMember/${memberId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fullName: 'Updated Child User' });

      expect(updateRes.statusCode).toEqual(200);
      expect(updateRes.body.member.fullName).toBe('Updated Child User');
    });

    it('should soft-delete a family member', async () => {
      const createRes = await request(app)
        .post('/api/users/createFamilyMember')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fullName: 'Child User', gender: 'female', dateOfBirth: '2015-05-15', relationship: 'daughter' });
      
      const memberId = createRes.body.member._id;

      const deleteRes = await request(app)
        .delete(`/api/users/deleteFamilyMember/${memberId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(deleteRes.statusCode).toEqual(200);
      expect(deleteRes.body.message).toBe('Family member deleted successfully');
    });
  });

  describe('Family Member Profile (Medical Info) Operations', () => {
    let familyMemberId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/users/createFamilyMember')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fullName: 'Son User', gender: 'male', dateOfBirth: '2018-10-10', relationship: 'son' });
      
      familyMemberId = createRes.body.member._id;
    });

    it('should create a medical profile for a family member', async () => {
      const res = await request(app)
        .post(`/api/users/family-member-profile/${familyMemberId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bloodType: 'B+',
          allergies: ['Peanuts']
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bloodType).toBe('B+');
    });

    it('should get the medical profile for a family member', async () => {
      await request(app)
        .post(`/api/users/family-member-profile/${familyMemberId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bloodType: 'B+' });

      const res = await request(app)
        .get(`/api/users/family-member-profile/${familyMemberId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bloodType).toBe('B+');
    });

    it('should update the medical profile for a family member', async () => {
      await request(app)
        .post(`/api/users/family-member-profile/${familyMemberId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bloodType: 'B+' });

      const res = await request(app)
        .patch(`/api/users/family-member-profile/${familyMemberId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bloodType: 'O-' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bloodType).toBe('O-');
    });
  });
});
