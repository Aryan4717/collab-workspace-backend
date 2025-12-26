import app from './app';
import { env } from './config/env';

const startServer = (): void => {
  const server = app.listen(env.port, () => {
    console.log(`🚀 Server is running on port ${env.port}`);
    console.log(`📦 Environment: ${env.nodeEnv}`);
    console.log(`🔗 Health check: http://localhost:${env.port}/api/${env.apiVersion}/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
};

startServer();

