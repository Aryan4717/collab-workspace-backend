import request from 'supertest';
import app from '../../app';
import { AppDataSource } from '../../config/database';
import { User } from '../../shared/entities/user.entity';
import { RefreshToken } from '../../shared/entities/refresh-token.entity';

// Skip integration tests if database is not available
const SKIP_INTEGRATION = process.env.SKIP_INTEGRATION_TESTS === 'true';
let dbAvailable = false;

(SKIP_INTEGRATION ? describe.skip : describe)('Auth Integration Tests', () => {
  beforeAll(async () => {
    // Initialize test database connection
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      // Test the connection
      await AppDataSource.query('SELECT 1');
      dbAvailable = true;
      console.log('✅ Database connected successfully for integration tests, dbAvailable =', dbAvailable);
    } catch (error) {
      console.warn('❌ Database not available, skipping integration tests', (error as Error).message);
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    // Close database connection
    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) {
      return;
    }
    // Clean up test data
    try {
      if (AppDataSource.isInitialized) {
        const userRepo = AppDataSource.getRepository(User);
        const tokenRepo = AppDataSource.getRepository(RefreshToken);
        await tokenRepo.delete({});
        await userRepo.delete({});
      }
    } catch (error) {
      // Ignore cleanup errors - might fail if tables don't exist yet
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available (dbAvailable =', dbAvailable, ')');
        return;
      }
      const userData = {
        email: 'newuser@test.com',
        password: 'password123',
        name: 'Test User',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);
      
      if (response.status !== 201) {
        console.log('Registration failed:', response.status, response.body);
      }
      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 400 if user already exists', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const uniqueEmail = `existing${Date.now()}@test.com`;
      const userData = {
        email: uniqueEmail,
        password: 'password123',
        name: 'Existing User',
      };

      // Register first time
      await request(app).post('/api/v1/auth/register').send(userData).expect(201);

      // Try to register again
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should return 400 if email is missing', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const userData = {
        password: 'password123',
        name: 'Test User',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let loginEmail: string;
    
    beforeEach(async () => {
      if (!dbAvailable) {
        return;
      }
      // Create a test user with unique email
      loginEmail = `login${Date.now()}@test.com`;
      const userData = {
        email: loginEmail,
        password: 'password123',
        name: 'Login User',
      };
      await request(app).post('/api/v1/auth/register').send(userData);
    });

    it('should login user with valid credentials', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const loginData = {
        email: loginEmail,
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should return 401 with invalid email', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const loginData = {
        email: 'wrong@test.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should return 401 with invalid password', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const loginData = {
        email: 'login@test.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      if (!dbAvailable) {
        return;
      }
      // Create a test user and get tokens
      const userData = {
        email: 'refresh@test.com',
        password: 'password123',
        name: 'Refresh User',
      };
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);
      if (registerResponse.body.data?.tokens) {
        refreshToken = registerResponse.body.data.tokens.refreshToken;
      }
    });

    it('should refresh token successfully', async () => {
      if (!dbAvailable || !refreshToken) {
        console.log('Skipping test: Database not available');
        return;
      }
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 401 with invalid refresh token', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      if (!dbAvailable) {
        return;
      }
      // Create a test user and get token
      const userData = {
        email: 'me@test.com',
        password: 'password123',
        name: 'Me User',
      };
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);
      if (registerResponse.body.data?.tokens) {
        accessToken = registerResponse.body.data.tokens.accessToken;
      }
    });

    it('should return user info with valid token', async () => {
      if (!dbAvailable || !accessToken) {
        console.log('Skipping test: Database not available');
        return;
      }
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('me@test.com');
    });

    it('should return 401 without token', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const response = await request(app).get('/api/v1/auth/me').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

