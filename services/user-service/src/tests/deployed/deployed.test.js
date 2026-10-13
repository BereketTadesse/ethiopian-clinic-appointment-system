import request from 'supertest';
import { jest } from '@jest/globals';

const DEPLOYED_URL = process.env.DEPLOYED_URL || 'https://clinic-user-service.onrender.com';

describe('Deployed User Service Live E2E Tests', () => {
  // Give Render cloud requests ample timeout (15s per test)
  jest.setTimeout(15000);

  let adminAccessToken;
  let doctorId;

  describe('1. Health & Documentation Probes', () => {
    it('GET /health - should return 200 and healthy status', async () => {
      const res = await request(DEPLOYED_URL).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('UP');
    });

    it('GET /api-docs/ - should return 200 and serve Swagger UI', async () => {
      const res = await request(DEPLOYED_URL).get('/api-docs/');
      expect([200, 301, 302]).toContain(res.statusCode);
    });
  });

  describe('2. Registration Validation (Auth Route)', () => {
    it('POST /api/users/register - should fail with 400 if required fields are missing', async () => {
      const res = await request(DEPLOYED_URL)
        .post('/api/users/register')
        .send({ name: 'Missing Fields Probe' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/all fields are required|invalid input/i);
    });

    it('POST /api/users/register - should fail with 400 if user email already exists', async () => {
      const res = await request(DEPLOYED_URL)
        .post('/api/users/register')
        .send({
          name: 'Duplicate Admin',
          email: 'admin@clinic.et',
          password: 'Password123!',
          phoneNumber: '+251911000001',
          gender: 'male',
          address: 'Bole, Addis Ababa',
        });

      expect([400, 409]).toContain(res.statusCode);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  describe('3. Authentication & JWT Tokens (Auth Route)', () => {
    it('POST /api/users/login - should fail with invalid password', async () => {
      const res = await request(DEPLOYED_URL)
        .post('/api/users/login')
        .send({
          email: 'admin@clinic.et',
          password: 'IncorrectPassword999!',
        });

      expect([400, 401]).toContain(res.statusCode);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('POST /api/users/login - should authenticate successfully with valid admin credentials', async () => {
      const res = await request(DEPLOYED_URL)
        .post('/api/users/login')
        .send({
          email: 'admin@clinic.et',
          password: 'Admin@123456',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      adminAccessToken = res.body.accessToken;

      // Verify refresh token cookie was set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });
  });

  describe('4. Protected Routes & Role-Based Access Control (Profile Route)', () => {
    it('GET /api/users/getUsers - should fail with 401 if unauthenticated', async () => {
      const res = await request(DEPLOYED_URL).get('/api/users/getUsers');
      expect([401, 403]).toContain(res.statusCode);
    });

    it('GET /api/users/getUsers - should succeed with 200 when authenticated as admin', async () => {
      expect(adminAccessToken).toBeDefined();

      const res = await request(DEPLOYED_URL)
        .get('/api/users/getUsers')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Save a doctor ID for doctor profile test
      const doctor = res.body.data.find((u) => u.role === 'doctor');
      if (doctor) {
        doctorId = doctor._id;
      }
    });

    it('GET /api/users/public-doctor-account/:id - should retrieve public doctor info', async () => {
      if (!doctorId) {
        return; // Skip if no doctor found
      }

      const res = await request(DEPLOYED_URL).get(`/api/users/public-doctor-account/${doctorId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.user?.name).toBeDefined();
    });
  });
});
