import 'reflect-metadata';
import { env } from './config/env';
import { AppDataSource } from './config/database';
import { workerService } from './modules/job/worker.service';
import { closeRedisConnections } from './config/redis';
import logger from './shared/utils/logger';

const startWorker = async (): Promise<void> => {
  try {
    // Initialize database connection (needed for job status updates)
    await AppDataSource.initialize();
    logger.info('Database connected successfully', {
      host: env.dbHost,
      port: env.dbPort,
      database: env.dbName,
    });

    // Initialize worker service for async job processing
    workerService.initialize();

    logger.info('Worker service started successfully', {
      environment: env.nodeEnv,
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.warn(`${signal} signal received: closing worker service`);

      // Close worker service
      await workerService.closeAll();

      // Close Redis connections
      await closeRedisConnections();

      // Close database connection
      await AppDataSource.destroy();

      logger.info('Database connection closed');
      logger.info('Redis connections closed');
      logger.info('Worker service closed');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Error starting worker service', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
};

startWorker();
