import request from 'supertest';
import { jest } from '@jest/globals';
import { connectDB, closeDB, clearDB } from '../setup/db.setup.js';

// Mock the email sending utility so tests don't actually send emails via Resend/Brevo
jest.unstable_mockModule('../../utils/send-email.js', () => ({
  default: jest.fn().mockResolvedValue(true)
}));

// Mock express-rate-limit so tests don't fail with 429 Too Many Requests
jest.unstable_mockModule('express-rate-limit', () => ({
  default: () => (req, res, next) => next()
}));

// We must dynamically import the controller/app AFTER mocking modules 
// when using ES Modules and Jest.
let sendVerificationEmail;
let app;
let User;

beforeAll(async () => {
  // Set required env vars for testing
  process.env.JWT_SECRET = 'test_jwt_secret';
  process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret';
  process.env.JWT_EXPIRE = '15m';
  process.env.JWT_REFRESH_EXPIRE = '7d';

  await connectDB();
  const emailModule = await import('../../utils/send-email.js');
  sendVerificationEmail = emailModule.default;
  
  const appModule = await import('../setup/app.setup.js');
  app = appModule.default;

  const userModule = await import('../../models/user-service.model.js');
  User = userModule.default;
});

afterEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

afterAll(async () => {
  await closeDB();
});

describe('Authentication Endpoints', () => {
  
  const validUser = {
    name: 'Test Patient',
    email: 'patient.test@clinic.com',
    phoneNumber: '+251911123456',
    address: 'Bole, Addis Ababa',
    password: 'Password123!',
    gender: 'male',
    role: 'patient'
  };

  describe('POST /api/users/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send(validUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toBe('User created successfully');
      expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(sendVerificationEmail).toHaveBeenCalledWith(
        validUser.email,
        expect.any(String),
        expect.any(String)
      );
    });

    it('should fail to register if email already exists', async () => {
      // Create first user
      await request(app).post('/api/users/register').send(validUser);
      
      // Try to create again
      const res = await request(app)
        .post('/api/users/register')
        .send(validUser);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('User with this email already exists');
    });

    it('should fail to register if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Missing Fields User'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('All fields are required');
    });
  });

  describe('POST /api/users/login', () => {
    it('should fail to login if email is not verified', async () => {
      await request(app).post('/api/users/register').send(validUser);

      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('Please verify your email before logging in');
    });

    it('should login successfully with correct credentials and verified email', async () => {
      await request(app).post('/api/users/register').send(validUser);
      // Manually verify user for the test
      await User.updateOne({ email: validUser.email }, { isVerified: true });

      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.accessToken).toBeDefined();
      
      // Verify that httpOnly cookies were set for the refresh token
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.includes('refreshToken='))).toBe(true);
    });

    it('should fail to login with incorrect password', async () => {
      await request(app).post('/api/users/register').send(validUser);
      await User.updateOne({ email: validUser.email }, { isVerified: true });

      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: validUser.email,
          password: 'WrongPassword123'
        });

      expect([400, 401]).toContain(res.statusCode);
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/users/logout', () => {
    it('should logout and clear cookies', async () => {
      // First, setup a verified user and log them in
      await request(app).post('/api/users/register').send(validUser);
      await User.updateOne({ email: validUser.email }, { isVerified: true });

      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: validUser.email, password: validUser.password });

      const token = loginRes.body.accessToken;

      // Now logout
      const res = await request(app)
        .post('/api/users/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Logged out cleanly. Tokens revoked securely.');

      // Verify cookies are cleared
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.length).toBeGreaterThan(0);
    });
  });

});
