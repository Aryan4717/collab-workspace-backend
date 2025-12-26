import express, { Application, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import workspaceRoutes from './modules/workspace/workspace.routes';
import projectRoutes from './modules/project/project.routes';
import inviteRoutes from './modules/invite/invite.routes';
import roleRoutes from './modules/role/role.routes';
import { ApiResponse } from './shared/types';
import { generalRateLimiter } from './shared/middleware/rateLimiter.middleware';
import { httpLogger } from './shared/middleware/httpLogger.middleware';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);
app.use(generalRateLimiter);

// Swagger documentation
app.use(`/api/${env.apiVersion}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use(`/api/${env.apiVersion}/health`, healthRoutes);
app.use(`/api/${env.apiVersion}/auth`, authRoutes);
app.use(`/api/${env.apiVersion}/workspaces`, workspaceRoutes);
app.use(`/api/${env.apiVersion}/projects`, projectRoutes);
app.use(`/api/${env.apiVersion}`, inviteRoutes);
app.use(`/api/${env.apiVersion}`, roleRoutes);

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

