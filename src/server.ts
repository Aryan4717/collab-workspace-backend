import 'reflect-metadata';
import app from './app';
import { env } from './config/env';
import { AppDataSource } from './config/database';
import logger from './shared/utils/logger';

const startServer = async (): Promise<void> => {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    logger.info('Database connected successfully', {
      host: env.dbHost,
      port: env.dbPort,
      database: env.dbName,
    });

    const server = app.listen(env.port, () => {
      logger.info('Server started successfully', {
        port: env.port,
        environment: env.nodeEnv,
        apiVersion: env.apiVersion,
        healthCheck: `http://localhost:${env.port}/api/${env.apiVersion}/health`,
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.warn('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        await AppDataSource.destroy();
        logger.info('Database connection closed');
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.warn('SIGINT signal received: closing HTTP server');
      server.close(async () => {
        await AppDataSource.destroy();
        logger.info('Database connection closed');
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Error starting server', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
};

startServer();

