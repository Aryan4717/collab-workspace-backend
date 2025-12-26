import express, { Application, Request, Response } from 'express';
import { env } from './config/env';
import healthRoutes from './modules/health/health.routes';
import { ApiResponse } from './shared/types';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use(`/api/${env.apiVersion}/health`, healthRoutes);

// Root route
app.get('/', (_req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: true,
    message: 'Collaborative Workspace Backend API',
  };
  res.status(200).json(response);
});

// 404 handler
app.use((_req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    error: 'Route not found',
  };
  res.status(404).json(response);
});

export default app;

