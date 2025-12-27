import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../shared/types';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import logger from '../../shared/utils/logger';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      const response: ApiResponse = {
        success: false,
        error: 'Email, password, and name are required',
      };
      res.status(400).json(response);
      return;
    }

    const result = await AuthService.register({ email, password, name });

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'User registered successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    logger.error('Registration failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      email: req.body?.email,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    };
    res.status(400).json(response);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const response: ApiResponse = {
        success: false,
        error: 'Email and password are required',
      };
      res.status(400).json(response);
      return;
    }

    const result = await AuthService.login(email, password);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Login successful',
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Login failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email: req.body?.email,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
    res.status(401).json(response);
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const response: ApiResponse = {
        success: false,
        error: 'Refresh token is required',
      };
      res.status(400).json(response);
      return;
    }

    const tokens = await AuthService.refreshToken(refreshToken);

    const response: ApiResponse = {
      success: true,
      data: { tokens },
      message: 'Tokens refreshed successfully',
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Token refresh failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
    };
    res.status(401).json(response);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Logout successful',
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Logout failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed',
    };
    res.status(400).json(response);
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const user = await AuthService.getUserById(req.user.userId);

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: { user },
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to get user', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      stack: error instanceof Error ? error.stack : undefined,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user',
    };
    res.status(500).json(response);
  }
};

