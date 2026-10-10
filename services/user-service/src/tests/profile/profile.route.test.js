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

jest.unstable_mockModule('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockResolvedValue({ secure_url: 'https://mock.cloudinary.com/image.jpg' })
    }
  }
}));

// We must dynamically import the controller/app AFTER mocking modules
let app;
let User;
let PatientProfile;

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

  const patientProfileModule = await import('../../models/PatientProfile.js');
  PatientProfile = patientProfileModule.default;
});

afterEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

afterAll(async () => {
  await closeDB();
});

describe('Profile Endpoints', () => {
  let userToken;
  let userId;

  const validUser = {
    name: 'Test Patient',
    email: 'patient.profile@clinic.com',
    phoneNumber: '+251911123456',
    address: 'Bole, Addis Ababa',
    password: 'Password123!',
    gender: 'male',
    role: 'patient'
  };

  beforeEach(async () => {
    // Register the user
    await request(app).post('/api/users/register').send(validUser);
    
    // Verify the user
    const userDoc = await User.findOneAndUpdate(
      { email: validUser.email }, 
      { isVerified: true },
      { new: true }
    );
    userId = userDoc._id.toString();

    // Login to get token
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ email: validUser.email, password: validUser.password });
    
    userToken = loginRes.body.accessToken;
  });

  describe('POST /api/users/patient-profile', () => {
    it('should create a new patient profile', async () => {
      const profileData = {
        bloodType: 'O+',
        allergies: ['Dust'],
        emergencyContact: {
          name: 'Dad',
          phoneNumber: '+251911998877',
          relationship: 'Father'
        }
      };

      const res = await request(app)
        .post('/api/users/patient-profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(profileData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bloodType).toBe('O+');
      expect(res.body.data.allergies).toContain('Dust');
      expect(res.body.data.user.name).toBe(validUser.name); // populated
    });

    it('should fail if a profile already exists', async () => {
      const profileData = { bloodType: 'A+' };

      // Create once
      await request(app)
        .post('/api/users/patient-profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(profileData);

      // Create again
      const res = await request(app)
        .post('/api/users/patient-profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(profileData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Patient profile already exists. Use the update endpoint to modify it.');
    });
  });

  describe('PUT /api/users/update-profile', () => {
    it('should split updates between User and PatientProfile correctly', async () => {
      const updateData = {
        name: 'Updated Patient Name', // Goes to User
        bloodType: 'B-' // Goes to PatientProfile
      };

      const res = await request(app)
        .put('/api/users/update-profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bloodType).toBe('B-');
      
      // Verify in DB directly
      const updatedUser = await User.findById(userId);
      expect(updatedUser.name).toBe('Updated Patient Name');

      const profile = await PatientProfile.findOne({ user: userId });
      expect(profile.bloodType).toBe('B-');
    });
  });

  describe('GET /api/users/profile/:id', () => {
    it('should return a populated profile for a patient', async () => {
      // First, create the patient profile
      await request(app)
        .post('/api/users/patient-profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bloodType: 'AB+' });

      // Then fetch it
      const res = await request(app)
        .get(`/api/users/profile/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bloodType).toBe('AB+');
      expect(res.body.data.user.name).toBe(validUser.name);
    });

    it('should return a safe fallback layout if profile does not exist yet', async () => {
      const res = await request(app)
        .get(`/api/users/profile/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      // Safe fallback returns `user` object directly at the root if no profile was created
      expect(res.body.data.user.name).toBe(validUser.name);
      expect(res.body.data.bloodType).toBeUndefined(); // Because we didn't save any
    });
  });

});
