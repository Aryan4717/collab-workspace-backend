import 'reflect-metadata';
import app from './app';
import { env } from './config/env';
import { AppDataSource } from './config/database';

const startServer = async (): Promise<void> => {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');

    const server = app.listen(env.port, () => {
      console.log(`🚀 Server is running on port ${env.port}`);
      console.log(`📦 Environment: ${env.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${env.port}/api/${env.apiVersion}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        await AppDataSource.destroy();
        console.log('Database connection closed');
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(async () => {
        await AppDataSource.destroy();
        console.log('Database connection closed');
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

startServer();

