import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { User, CreateUserDto, UserResponse } from '../../shared/entities/user.entity';
import { RefreshToken } from '../../shared/entities/refresh-token.entity';
import { JwtUtil, TokenPair } from '../../shared/utils/jwt.util';

export class AuthService {
  private static userRepository: Repository<User> = AppDataSource.getRepository(User);
  private static refreshTokenRepository: Repository<RefreshToken> =
    AppDataSource.getRepository(RefreshToken);

  static async register(userData: CreateUserDto): Promise<{
    user: UserResponse;
    tokens: TokenPair;
  }> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });
    if (existingUser) {
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

    const savedUser = await this.userRepository.save(user);

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

    return {
      user: savedUser.toResponse(),
      tokens,
    };
  }

  static async login(email: string, password: string): Promise<{
    user: UserResponse;
    tokens: TokenPair;
  }> {
    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
    });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await User.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = JwtUtil.generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt,
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      user: user.toResponse(),
      tokens,
    };
  }

  static async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    const payload = JwtUtil.verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database and is valid
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!tokenEntity) {
      throw new Error('Invalid refresh token');
    }

    // Check if token is expired
    if (tokenEntity.expiresAt < new Date()) {
      // Remove expired token
      await this.refreshTokenRepository.remove(tokenEntity);
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

    return tokens;
  }

  static async logout(refreshToken: string): Promise<void> {
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (tokenEntity) {
      await this.refreshTokenRepository.remove(tokenEntity);
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
    const now = new Date();
    await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now })
      .execute();
  }
}
