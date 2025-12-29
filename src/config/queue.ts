import { Queue, QueueOptions, ConnectionOptions } from 'bullmq';
import { JobType } from '../shared/entities/job.entity';
import logger from '../shared/utils/logger';
import { env } from './env';

// Parse Redis URL into connection parameters
const parseRedisUrl = (
  url: string
): {
  host: string;
  port: number;
  password?: string;
  username?: string;
} => {
  try {
    // Parse redis://[username:password@]host:port format
    const urlObj = new URL(url);
    return {
      host: urlObj.hostname,
      port: parseInt(urlObj.port || '6379', 10),
      password: urlObj.password || undefined,
      username: urlObj.username || undefined,
    };
  } catch (error) {
    logger.error('Failed to parse REDIS_URL for queue', {
      error: error instanceof Error ? error.message : 'Unknown error',
      urlPrefix: url.substring(0, 30),
    });
    throw new Error('Invalid REDIS_URL format');
  }
};

// Build Redis connection config for BullMQ
// BullMQ/ioredis supports both connection URL string and connection object
// Use REDIS_URL in production (Railway), individual params in development
const buildQueueConnection = (): ConnectionOptions => {
  const hasRedisUrl =
    env.nodeEnv === 'production' && env.redisUrl && env.redisUrl.trim() !== '';

  if (hasRedisUrl && env.redisUrl) {
    // Parse REDIS_URL into connection parameters for BullMQ
    const parsed = parseRedisUrl(env.redisUrl);
    logger.info('Queue Redis connection - parsed REDIS_URL', {
      host: parsed.host,
      port: parsed.port,
      hasPassword: !!parsed.password,
      hasUsername: !!parsed.username,
    });
    return {
      host: parsed.host,
      port: parsed.port,
      password: parsed.password,
      username: parsed.username,
    } as ConnectionOptions;
  }

  // Development: use connection object
  logger.info('Queue Redis connection - using host/port', {
    host: env.redisHost || 'localhost',
    port: env.redisPort || 6379,
  });
  return {
    host: env.redisHost || 'localhost',
    port: env.redisPort || 6379,
    password: env.redisPassword,
  };
};

const connection = buildQueueConnection();

// BullMQ doesn't allow colons in queue names, so we sanitize them
const sanitizeQueueName = (jobType: JobType): string => {
  return jobType.replace(/:/g, '-');
};

const defaultQueueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

class QueueManager {
  private queues: Map<JobType, Queue> = new Map();

  getQueue(jobType: JobType): Queue {
    if (!this.queues.has(jobType)) {
      const queueName = sanitizeQueueName(jobType);
      const queue = new Queue(queueName, defaultQueueOptions);

      queue.on('error', error => {
        logger.error('Queue error', {
          queue: jobType,
          error: error.message,
          stack: error.stack,
          connectionType:
            env.nodeEnv === 'production' && env.redisUrl
              ? 'REDIS_URL (parsed)'
              : 'host/port',
          connectionInfo:
            env.nodeEnv === 'production' && env.redisUrl
              ? parseRedisUrl(env.redisUrl)
              : {
                  host: env.redisHost || 'localhost',
                  port: env.redisPort || 6379,
                  hasPassword: !!env.redisPassword,
                },
        });
      });

      // Queue event listeners - using any to avoid type issues with BullMQ events
      (queue as any).on('waiting', (job: any) => {
        logger.debug('Job waiting', {
          queue: jobType,
          jobId: job.id,
          jobName: job.name,
        });
      });

      (queue as any).on('active', (job: any) => {
        logger.info('Job started', {
          queue: jobType,
          jobId: job.id,
          jobName: job.name,
          attemptsMade: job.attemptsMade,
        });
      });

      (queue as any).on('completed', (job: any, result: any) => {
        logger.info('Job completed', {
          queue: jobType,
          jobId: job.id,
          jobName: job.name,
          result: result,
        });
      });

      (queue as any).on('failed', (job: any, error: Error) => {
        logger.error('Job failed', {
          queue: jobType,
          jobId: job?.id,
          jobName: job?.name,
          attemptsMade: job?.attemptsMade,
          error: error.message,
          stack: error.stack,
        });
      });

      this.queues.set(jobType, queue);
      logger.info('Queue created', { queue: jobType });
    }

    return this.queues.get(jobType)!;
  }

  async addJob(
    jobType: JobType,
    data: Record<string, any>,
    options?: {
      idempotencyKey?: string;
      delay?: number;
      attempts?: number;
      priority?: number;
    }
  ): Promise<string> {
    const queue = this.getQueue(jobType);

    const jobOptions: any = {
      jobId: options?.idempotencyKey, // Use idempotency key as jobId for idempotency
      delay: options?.delay,
      attempts: options?.attempts,
      priority: options?.priority,
    };

    // If idempotency key is provided, BullMQ will prevent duplicate jobs with same jobId
    // Job name can contain colons, only queue name cannot
    const job = await queue.add(jobType, data, jobOptions);

    logger.info('Job added to queue', {
      queue: jobType,
      jobId: job.id,
      idempotencyKey: options?.idempotencyKey,
    });

    return job.id!;
  }

  async getJob(jobType: JobType, jobId: string) {
    const queue = this.getQueue(jobType);
    return await queue.getJob(jobId);
  }

  async removeJob(jobType: JobType, jobId: string): Promise<boolean> {
    const queue = this.getQueue(jobType);
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info('Job removed from queue', {
        queue: jobType,
        jobId,
      });
      return true;
    }
    return false;
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map(queue =>
      queue.close()
    );
    await Promise.all(closePromises);
    this.queues.clear();
    logger.info('All queues closed');
  }
}

export const queueManager = new QueueManager();
