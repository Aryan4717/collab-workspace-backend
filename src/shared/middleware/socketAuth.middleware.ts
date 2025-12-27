import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { JwtUtil } from '../utils/jwt.util';
import logger from '../utils/logger';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

export const socketAuthMiddleware = (
  socket: AuthenticatedSocket,
  next: (err?: ExtendedError) => void
): void => {
  try {
    // Try multiple sources for token (auth object, Authorization header, or query parameter)
    const queryToken = socket.handshake.query?.token;
    const tokenFromQuery = Array.isArray(queryToken)
      ? queryToken[0]
      : queryToken;

    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      tokenFromQuery;

    if (!token) {
      logger.warn('Socket connection rejected: No token provided', {
        socketId: socket.id,
      });
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = JwtUtil.verifyAccessToken(token);
    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;

    logger.info('Socket authenticated', {
      socketId: socket.id,
      userId: decoded.userId,
      email: decoded.email,
    });

    next();
  } catch (error) {
    logger.warn('Socket authentication failed', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(new Error('Authentication error: Invalid token'));
  }
};
