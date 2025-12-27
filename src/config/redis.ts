import Redis from 'ioredis';
import { env } from './env';
import logger from '../shared/utils/logger';

let redisClient: Redis | null = null;
let redisSubscriber: Redis | null = null;
let redisPublisher: Redis | null = null;

// Build Redis connection options based on environment
const buildRedisOptions = (): {
  retryStrategy: (times: number) => number;
  maxRetriesPerRequest: number;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
  host?: string;
  port?: number;
  password?: string;
} => {
  // In production (Railway), use REDIS_URL if provided
  if (env.nodeEnv === 'production' && env.redisUrl) {
    return {
      // ioredis supports connection URLs directly
      // Format: redis://[:password@]host[:port][/db-number]
      // or: rediss://[:password@]host[:port][/db-number] for TLS
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    };
  }

  // In development, use individual connection parameters
  return {
    host: env.redisHost || 'localhost',
    port: env.redisPort || 6379,
    password: env.redisPassword,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  };
};

// Create Redis instance with appropriate configuration
const createRedisInstance = (
  label: string,
  url?: string
): Redis => {
  const options = buildRedisOptions();
  const redisInstance = url ? new Redis(url, options) : new Redis(options);

  redisInstance.on('connect', () => {
    logger.info(`Redis ${label} connected`);
  });

  redisInstance.on('ready', () => {
    logger.info(`Redis ${label} ready`);
  });

  redisInstance.on('error', (error: Error) => {
    // Only log error, don't throw - let retry strategy handle reconnection
    logger.error(`Redis ${label} error`, {
      error: error.message,
      code: (error as any).code,
    });
  });

  redisInstance.on('close', () => {
    logger.warn(`Redis ${label} connection closed`);
  });

  redisInstance.on('reconnecting', (delay: number) => {
    logger.info(`Redis ${label} reconnecting in ${delay}ms`);
  });

  return redisInstance;
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = createRedisInstance(
      'client',
      env.nodeEnv === 'production' ? env.redisUrl : undefined
    );
  }
  return redisClient;
};

export const getRedisSubscriber = (): Redis => {
  if (!redisSubscriber) {
    redisSubscriber = createRedisInstance(
      'subscriber',
      env.nodeEnv === 'production' ? env.redisUrl : undefined
    );
  }
  return redisSubscriber;
};

export const getRedisPublisher = (): Redis => {
  if (!redisPublisher) {
    redisPublisher = createRedisInstance(
      'publisher',
      env.nodeEnv === 'production' ? env.redisUrl : undefined
    );
  }
  return redisPublisher;
};

export const closeRedisConnections = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (redisSubscriber) {
    await redisSubscriber.quit();
    redisSubscriber = null;
  }
  if (redisPublisher) {
    await redisPublisher.quit();
    redisPublisher = null;
  }
  logger.info('Redis connections closed');
};
