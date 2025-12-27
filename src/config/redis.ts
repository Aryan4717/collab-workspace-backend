import Redis from 'ioredis';
import { env } from './env';
import logger from '../shared/utils/logger';

let redisClient: Redis | null = null;
let redisSubscriber: Redis | null = null;
let redisPublisher: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis({
      host: env.redisHost || 'localhost',
      port: env.redisPort || 6379,
      password: env.redisPassword,
      retryStrategy: times => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('error', error => {
      logger.error('Redis client error', { error: error.message });
    });
  }
  return redisClient;
};

export const getRedisSubscriber = (): Redis => {
  if (!redisSubscriber) {
    redisSubscriber = new Redis({
      host: env.redisHost || 'localhost',
      port: env.redisPort || 6379,
      password: env.redisPassword,
      retryStrategy: times => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisSubscriber.on('connect', () => {
      logger.info('Redis subscriber connected');
    });

    redisSubscriber.on('error', error => {
      logger.error('Redis subscriber error', { error: error.message });
    });
  }
  return redisSubscriber;
};

export const getRedisPublisher = (): Redis => {
  if (!redisPublisher) {
    redisPublisher = new Redis({
      host: env.redisHost || 'localhost',
      port: env.redisPort || 6379,
      password: env.redisPassword,
      retryStrategy: times => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisPublisher.on('connect', () => {
      logger.info('Redis publisher connected');
    });

    redisPublisher.on('error', error => {
      logger.error('Redis publisher error', { error: error.message });
    });
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
