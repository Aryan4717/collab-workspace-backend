// Mock dependencies BEFORE importing the service
jest.mock('../../../config/database');
jest.mock('../../../shared/utils/jwt.util');
jest.mock('../../../shared/utils/logger');

import { AuthService } from '../auth.service';
import { AppDataSource } from '../../../config/database';
import { User } from '../../../shared/entities/user.entity';
import { RefreshToken } from '../../../shared/entities/refresh-token.entity';
import { JwtUtil } from '../../../shared/utils/jwt.util';
import {
  createMockUser,
  createMockRefreshToken,
  createMockRepository,
} from '../../../__tests__/helpers/test-helpers';

describe('AuthService', () => {
  let mockUserRepository: jest.Mocked<any>;
  let mockRefreshTokenRepository: jest.Mocked<any>;

  beforeEach(() => {
    // Create mock repositories
    mockUserRepository = createMockRepository<User>();
    mockRefreshTokenRepository = createMockRepository<RefreshToken>();

    // Mock AppDataSource.getRepository to return our mocks
    (AppDataSource.getRepository as jest.Mock) = jest.fn(entity => {
      if (entity === User) return mockUserRepository;
      if (entity === RefreshToken) return mockRefreshTokenRepository;
      return createMockRepository();
    });

    // Re-initialize the service repositories by accessing them
    // This forces them to use our mocked getRepository
    (AuthService as any).userRepository = mockUserRepository;
    (AuthService as any).refreshTokenRepository = mockRefreshTokenRepository;

    // Mock bcrypt
    jest.spyOn(User, 'hashPassword').mockResolvedValue('hashed-password');
    jest.spyOn(User, 'comparePassword').mockResolvedValue(true);

    // Mock JWT
    (JwtUtil.generateTokenPair as jest.Mock) = jest.fn(() => ({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    }));
    (JwtUtil.verifyRefreshToken as jest.Mock) = jest.fn(() => ({
      userId: 'user-123',
      email: 'test@example.com',
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(createMockUser(userData));
      mockUserRepository.save.mockResolvedValue(
        createMockUser({ ...userData, id: 'new-user-id' })
      );
      mockRefreshTokenRepository.create.mockReturnValue(
        createMockRefreshToken()
      );
      mockRefreshTokenRepository.save.mockResolvedValue(
        createMockRefreshToken()
      );

      const result = await AuthService.register(userData);

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      };

      mockUserRepository.findOne.mockResolvedValue(
        createMockUser({ email: userData.email })
      );

      await expect(AuthService.register(userData)).rejects.toThrow(
        'User with this email already exists'
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should hash password before saving', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(createMockUser(userData));
      mockUserRepository.save.mockResolvedValue(
        createMockUser({ ...userData, id: 'new-user-id' })
      );
      mockRefreshTokenRepository.create.mockReturnValue(
        createMockRefreshToken()
      );
      mockRefreshTokenRepository.save.mockResolvedValue(
        createMockRefreshToken()
      );

      await AuthService.register(userData);

      expect(User.hashPassword).toHaveBeenCalledWith(userData.password);
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockUser = createMockUser({ email, password: 'hashed-password' });

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRefreshTokenRepository.create.mockReturnValue(
        createMockRefreshToken()
      );
      mockRefreshTokenRepository.save.mockResolvedValue(
        createMockRefreshToken()
      );

      const result = await AuthService.login(email, password);

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(User.comparePassword).toHaveBeenCalledWith(
        password,
        mockUser.password
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should throw error if user not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(AuthService.login(email, password)).rejects.toThrow(
        'Invalid email or password'
      );
      expect(User.comparePassword).not.toHaveBeenCalled();
    });

    it('should throw error if password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const mockUser = createMockUser({ email });

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(User, 'comparePassword').mockResolvedValue(false);

      await expect(AuthService.login(email, password)).rejects.toThrow(
        'Invalid email or password'
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockTokenEntity = createMockRefreshToken({
        token: refreshToken,
        expiresAt: new Date(Date.now() + 10000),
      });

      mockRefreshTokenRepository.findOne.mockResolvedValue(mockTokenEntity);
      mockRefreshTokenRepository.remove.mockResolvedValue(mockTokenEntity);
      mockRefreshTokenRepository.create.mockReturnValue(
        createMockRefreshToken()
      );
      mockRefreshTokenRepository.save.mockResolvedValue(
        createMockRefreshToken()
      );

      const result = await AuthService.refreshToken(refreshToken);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(mockRefreshTokenRepository.remove).toHaveBeenCalled();
      expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
    });

    it('should throw error if token is invalid', async () => {
      const refreshToken = 'invalid-token';

      (JwtUtil.verifyRefreshToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(AuthService.refreshToken(refreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw error if token not found in database', async () => {
      const refreshToken = 'valid-refresh-token';

      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(AuthService.refreshToken(refreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw error if token is expired', async () => {
      const refreshToken = 'expired-refresh-token';
      const mockTokenEntity = createMockRefreshToken({
        token: refreshToken,
        expiresAt: new Date(Date.now() - 10000), // Expired
      });

      mockRefreshTokenRepository.findOne.mockResolvedValue(mockTokenEntity);
      mockRefreshTokenRepository.remove.mockResolvedValue(mockTokenEntity);

      await expect(AuthService.refreshToken(refreshToken)).rejects.toThrow(
        'Refresh token has expired'
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockTokenEntity = createMockRefreshToken({ token: refreshToken });

      mockRefreshTokenRepository.findOne.mockResolvedValue(mockTokenEntity);
      mockRefreshTokenRepository.remove.mockResolvedValue(mockTokenEntity);

      await AuthService.logout(refreshToken);

      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
      expect(mockRefreshTokenRepository.remove).toHaveBeenCalled();
    });

    it('should handle logout with invalid token gracefully', async () => {
      const refreshToken = 'invalid-token';

      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(AuthService.logout(refreshToken)).resolves.not.toThrow();
      expect(mockRefreshTokenRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user if found', async () => {
      const userId = 'user-123';
      const mockUser = createMockUser({ id: userId });

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await AuthService.getUserById(userId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(userId);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should return null if user not found', async () => {
      const userId = 'nonexistent-user';

      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await AuthService.getUserById(userId);

      expect(result).toBeNull();
    });
  });
});
