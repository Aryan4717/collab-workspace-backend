import express, { Application, Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import workspaceRoutes from './modules/workspace/workspace.routes';
import projectRoutes from './modules/project/project.routes';
import inviteRoutes from './modules/invite/invite.routes';
import roleRoutes from './modules/role/role.routes';
import jobRoutes from './modules/job/job.routes';
import { ApiResponse } from './shared/types';
import { generalRateLimiter } from './shared/middleware/rateLimiter.middleware';
import { httpLogger } from './shared/middleware/httpLogger.middleware';

const app: Application = express();

// Trust proxy - required when behind a reverse proxy (Railway, Heroku, etc.)
// This allows express-rate-limit to correctly identify client IPs
if (env.nodeEnv === 'production') {
  app.set('trust proxy', 1); // Trust first proxy (Railway's load balancer)
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);
app.use(generalRateLimiter);

// Swagger documentation
app.use(
  `/api/${env.apiVersion}/docs`,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

// Routes
app.use(`/api/${env.apiVersion}/health`, healthRoutes);
app.use(`/api/${env.apiVersion}/auth`, authRoutes);
app.use(`/api/${env.apiVersion}/workspaces`, workspaceRoutes);
app.use(`/api/${env.apiVersion}/projects`, projectRoutes);
app.use(`/api/${env.apiVersion}`, inviteRoutes);
app.use(`/api/${env.apiVersion}`, roleRoutes);
app.use(`/api/${env.apiVersion}/jobs`, jobRoutes);

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

// Error handling middleware (must be last)
app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    const response: ApiResponse = {
      success: false,
      error: err.message || 'Internal server error',
    };
    res.status(500).json(response);
  }
);

export default app;
