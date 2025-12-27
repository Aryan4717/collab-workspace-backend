import 'reflect-metadata';
import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { AppDataSource } from './config/database';
import { socketService } from './modules/realtime/socket.server';
import { workerService } from './modules/job/worker.service';
import { closeRedisConnections } from './config/redis';
import { queueManager } from './config/queue';
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

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize WebSocket server
    socketService.initialize(httpServer);

    // Note: Worker service is now run in a separate container/process
    // Only initialize worker if WORKER_ENABLED env var is set (for backward compatibility)
    if (process.env.WORKER_ENABLED === 'true') {
      workerService.initialize();
    }

    // Start server
    httpServer.listen(env.port, () => {
      logger.info('Server started successfully', {
        port: env.port,
        environment: env.nodeEnv,
        apiVersion: env.apiVersion,
        healthCheck: `http://localhost:${env.port}/api/${env.apiVersion}/health`,
        websocket: `ws://localhost:${env.port}`,
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.warn(`${signal} signal received: closing server`);
      
      httpServer.close(async () => {
        // Close WebSocket server
        socketService.close();
        
        // Close worker service (only if it was initialized)
        if (process.env.WORKER_ENABLED === 'true') {
          await workerService.closeAll();
          logger.info('Worker service closed');
        }
        
        // Close queue manager
        await queueManager.closeAll();
        
        // Close Redis connections
        await closeRedisConnections();
        
        // Close database connection
        await AppDataSource.destroy();
        
        logger.info('Database connection closed');
        logger.info('Redis connections closed');
        logger.info('WebSocket server closed');
        logger.info('Queue manager closed');
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Error starting server', {
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      dbConfig: {
        host: env.dbHost,
        port: env.dbPort,
        database: env.dbName,
        username: env.dbUsername,
      },
    });
    process.exit(1);
  }
};

startServer();

