import { v4 as uuidv4 } from 'uuid';
import { User, CreateUserDto, UserEntity, UserResponse } from '../../shared/entities/user.entity';
import { JwtUtil, TokenPair } from '../../shared/utils/jwt.util';

// In-memory store (replace with database in production)
const users: User[] = [];
const refreshTokens: Set<string> = new Set();

export class AuthService {
  static async register(userData: CreateUserDto): Promise<{
    user: UserResponse;
    tokens: TokenPair;
  }> {
    // Check if user already exists
    const existingUser = users.find((u) => u.email === userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await UserEntity.hashPassword(userData.password);

    // Create user
    const now = new Date();
    const user: User = {
      id: uuidv4(),
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      createdAt: now,
      updatedAt: now,
    };

    users.push(user);

    // Generate tokens
    const tokens = JwtUtil.generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    // Store refresh token
    refreshTokens.add(tokens.refreshToken);

    return {
      user: UserEntity.toResponse(user),
      tokens,
    };
  }

  static async login(email: string, password: string): Promise<{
    user: UserResponse;
    tokens: TokenPair;
  }> {
    // Find user
    const user = users.find((u) => u.email === email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await UserEntity.comparePassword(
      password,
      user.password
    );
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = JwtUtil.generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    // Store refresh token
    refreshTokens.add(tokens.refreshToken);

    return {
      user: UserEntity.toResponse(user),
      tokens,
    };
  }

  static async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    const payload = JwtUtil.verifyRefreshToken(refreshToken);

    // Check if refresh token exists in store
    if (!refreshTokens.has(refreshToken)) {
      throw new Error('Invalid refresh token');
    }

    // Generate new token pair
    const tokens = JwtUtil.generateTokenPair({
      userId: payload.userId,
      email: payload.email,
    });

    // Remove old refresh token and add new one
    refreshTokens.delete(refreshToken);
    refreshTokens.add(tokens.refreshToken);

    return tokens;
  }

  static async logout(refreshToken: string): Promise<void> {
    refreshTokens.delete(refreshToken);
  }

  static async getUserById(userId: string): Promise<UserResponse | null> {
    const user = users.find((u) => u.id === userId);
    return user ? UserEntity.toResponse(user) : null;
  }
}

