import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import {
  User,
  CreateUserDto,
  UserResponse,
} from '../../shared/entities/user.entity';
import { RefreshToken } from '../../shared/entities/refresh-token.entity';
import { JwtUtil, TokenPair } from '../../shared/utils/jwt.util';
import logger from '../../shared/utils/logger';

export class AuthService {
  private static userRepository: Repository<User> =
    AppDataSource.getRepository(User);
  private static refreshTokenRepository: Repository<RefreshToken> =
    AppDataSource.getRepository(RefreshToken);

  static async register(userData: CreateUserDto): Promise<{
    user: UserResponse;
    tokens: TokenPair;
  }> {
    logger.info('Attempting user registration', { email: userData.email });

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });
    if (existingUser) {
      logger.warn('Registration failed: User already exists', {
        email: userData.email,
      });
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await User.hashPassword(userData.password);

    // Create user
    const user = this.userRepository.create({
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
    });

    let savedUser;
    try {
      savedUser = await this.userRepository.save(user);
    } catch (error) {
      // Handle database constraint violations (e.g., unique constraint on email)
      // This can happen if cleanup didn't work or in race conditions
      if (error instanceof Error && error.message.includes('duplicate key')) {
        logger.warn(
          'Registration failed: User already exists (database constraint)',
          {
            email: userData.email,
          }
        );
        throw new Error('User with this email already exists');
      }
      // Re-throw other errors
      throw error;
    }
    logger.info('User created successfully', {
      userId: savedUser.id,
      email: savedUser.email,
    });

    // Generate tokens
    const tokens = JwtUtil.generateTokenPair({
      userId: savedUser.id,
      email: savedUser.email,
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: tokens.refreshToken,
      userId: savedUser.id,
      expiresAt,
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    logger.info('User registration completed successfully', {
      userId: savedUser.id,
      email: savedUser.email,
    });

    return {
      user: savedUser.toResponse(),
      tokens,
    };
  }

  static async login(
    email: string,
    password: string
  ): Promise<{
    user: UserResponse;
    tokens: TokenPair;
  }> {
    logger.info('Attempting user login', { email });

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
    });
    if (!user) {
      logger.warn('Login failed: User not found', { email });
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await User.comparePassword(password, user.password);
    if (!isPasswordValid) {
      logger.warn('Login failed: Invalid password', { email, userId: user.id });
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = JwtUtil.generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    // Store refresh token
    // Handle potential duplicate token by cleaning up old tokens for this user first
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    try {
      const refreshTokenEntity = this.refreshTokenRepository.create({
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      });
      await this.refreshTokenRepository.save(refreshTokenEntity);
    } catch (error) {
      // If duplicate key error, clean up old tokens and retry
      if (error instanceof Error && error.message.includes('duplicate key')) {
        logger.warn(
          'Duplicate refresh token detected during login, cleaning up old tokens',
          {
            userId: user.id,
          }
        );
        // Delete all existing refresh tokens for this user
        await this.refreshTokenRepository.delete({ userId: user.id });
        // Retry saving the new token
        const refreshTokenEntity = this.refreshTokenRepository.create({
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt,
        });
        await this.refreshTokenRepository.save(refreshTokenEntity);
      } else {
        // Re-throw if it's a different error
        throw error;
      }
    }

    logger.info('User login successful', {
      userId: user.id,
      email: user.email,
    });

    return {
      user: user.toResponse(),
      tokens,
    };
  }

  static async refreshToken(refreshToken: string): Promise<TokenPair> {
    logger.debug('Attempting to refresh token');

    // Verify refresh token
    let payload;
    try {
      payload = JwtUtil.verifyRefreshToken(refreshToken);
    } catch (error) {
      logger.warn('Token refresh failed: Invalid token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Invalid refresh token');
    }

    // Check if refresh token exists in database and is valid
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!tokenEntity) {
      logger.warn('Token refresh failed: Token not found in database', {
        userId: payload.userId,
      });
      throw new Error('Invalid refresh token');
    }

    // Check if token is expired
    if (tokenEntity.expiresAt < new Date()) {
      // Remove expired token
      await this.refreshTokenRepository.remove(tokenEntity);
      logger.warn('Token refresh failed: Token expired', {
        userId: payload.userId,
      });
      throw new Error('Refresh token has expired');
    }

    // Generate new token pair
    const tokens = JwtUtil.generateTokenPair({
      userId: payload.userId,
      email: payload.email,
    });

    // Remove old refresh token
    await this.refreshTokenRepository.remove(tokenEntity);

    // Store new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const newRefreshTokenEntity = this.refreshTokenRepository.create({
      token: tokens.refreshToken,
      userId: payload.userId,
      expiresAt,
    });
    await this.refreshTokenRepository.save(newRefreshTokenEntity);

    logger.info('Token refreshed successfully', {
      userId: payload.userId,
    });

    return tokens;
  }

  static async logout(refreshToken: string): Promise<void> {
    logger.debug('Attempting user logout');

    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (tokenEntity) {
      await this.refreshTokenRepository.remove(tokenEntity);
      logger.info('User logged out successfully', {
        userId: tokenEntity.userId,
      });
    } else {
      logger.warn('Logout attempted with invalid token');
    }
  }

  static async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    return user ? user.toResponse() : null;
  }

  // Clean up expired refresh tokens (can be called periodically)
  static async cleanupExpiredTokens(): Promise<void> {
    logger.debug('Starting cleanup of expired tokens');
    const now = new Date();
    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now })
      .execute();

    if (result.affected && result.affected > 0) {
      logger.info('Cleaned up expired tokens', {
        count: result.affected,
      });
    } else {
      logger.debug('No expired tokens to clean up');
    }
  }
}
