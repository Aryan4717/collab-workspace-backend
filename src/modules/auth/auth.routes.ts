import { Router } from 'express';
import { register, login, refresh, logout, getMe } from './auth.controller';
import { authRateLimiter } from '../../shared/middleware/rateLimiter.middleware';
import { authMiddleware } from '../../shared/middleware/auth.middleware';

const router = Router();

// Public routes with rate limiting
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh', authRateLimiter, refresh);
router.post('/logout', logout);

// Protected route
router.get('/me', authMiddleware, getMe);

export default router;

