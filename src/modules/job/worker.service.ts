import { Worker, WorkerOptions, Job as BullJob } from 'bullmq';
import { JobType, JobStatus } from '../../shared/entities/job.entity';
import { JobService } from './job.service';
import logger from '../../shared/utils/logger';
import { JobData, JobResult } from '../../shared/types/job.types';

// BullMQ doesn't allow colons in queue names, so we sanitize them
const sanitizeQueueName = (jobType: JobType): string => {
  return jobType.replace(/:/g, '-');
};

class WorkerService {
  private workers: Map<JobType, Worker> = new Map();
  private jobService = new JobService();

  private jobProcessors: Map<JobType, (data: JobData) => Promise<JobResult>> =
    new Map();

  initialize(): void {
    // Register job processors
    this.registerProcessors();

    // Create workers for each job type
    Object.values(JobType).forEach(jobType => {
      this.createWorker(jobType);
    });

    logger.info('Worker service initialized', {
      jobTypes: Object.values(JobType),
    });
  }

  private registerProcessors(): void {
    // Email send processor
    this.jobProcessors.set(JobType.EMAIL_SEND, async (data: JobData) => {
      logger.info('Processing email:send job', { data });

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock implementation - replace with actual email service
      if (data.shouldFail) {
        throw new Error('Email service unavailable');
      }

      return {
        messageId: `email-${Date.now()}`,
        recipient: data.to,
        sentAt: new Date().toISOString(),
      };
    });

    // File process processor
    this.jobProcessors.set(JobType.FILE_PROCESS, async (data: JobData) => {
      logger.info('Processing file:process job', { data });

      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (data.shouldFail) {
        throw new Error('File processing failed');
      }

      return {
        fileId: data.fileId,
        processedAt: new Date().toISOString(),
        size: data.size || 1024,
        format: data.format || 'unknown',
      };
    });

    // Data export processor
    this.jobProcessors.set(JobType.DATA_EXPORT, async (data: JobData) => {
      logger.info('Processing data:export job', { data });

      // Simulate data export
      await new Promise(resolve => setTimeout(resolve, 5000));

      if (data.shouldFail) {
        throw new Error('Export failed');
      }

      return {
        exportId: `export-${Date.now()}`,
        format: data.format || 'csv',
        recordCount: data.recordCount || 0,
        downloadUrl: `https://example.com/exports/${Date.now()}`,
      };
    });

    // Notification send processor
    this.jobProcessors.set(JobType.NOTIFICATION_SEND, async (data: JobData) => {
      logger.info('Processing notification:send job', { data });

      // Simulate notification sending
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (data.shouldFail) {
        throw new Error('Notification service error');
      }

      return {
        notificationId: `notif-${Date.now()}`,
        recipient: data.userId,
        type: data.type || 'info',
        sentAt: new Date().toISOString(),
      };
    });

    // Workspace backup processor
    this.jobProcessors.set(JobType.WORKSPACE_BACKUP, async (data: JobData) => {
      logger.info('Processing workspace:backup job', { data });

      // Simulate workspace backup
      await new Promise(resolve => setTimeout(resolve, 10000));

      if (data.shouldFail) {
        throw new Error('Backup failed');
      }

      return {
        backupId: `backup-${Date.now()}`,
        workspaceId: data.workspaceId,
        size: data.size || 0,
        backupUrl: `https://example.com/backups/${data.workspaceId}/${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
    });
  }

  private createWorker(jobType: JobType): void {
    // Use REDIS_URL in production (Railway), individual params in development
    const nodeEnv = process.env.NODE_ENV;
    const redisUrl = process.env.REDIS_URL;
    const hasRedisUrl = !!redisUrl && redisUrl.trim() !== '';

    // Comprehensive logging for debugging
    logger.info('Creating worker - Redis connection check', {
      jobType,
      nodeEnv,
      hasRedisUrl,
      redisUrlLength: redisUrl?.length || 0,
      redisUrlPrefix: redisUrl?.substring(0, 30) || 'not set',
      redisHost: process.env.REDIS_HOST || 'not set',
      redisPort: process.env.REDIS_PORT || 'not set',
    });

    const useRedisUrl = nodeEnv === 'production' && hasRedisUrl;

    const connection = useRedisUrl
      ? (redisUrl as any) // BullMQ accepts connection URL string
      : {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
        };

    // Log which connection method is being used
    logger.info('Worker Redis connection configured', {
      jobType,
      usingRedisUrl: useRedisUrl,
      connectionType: useRedisUrl ? 'REDIS_URL' : 'host/port',
      connectionHost: useRedisUrl ? 'from URL' : connection.host,
      connectionPort: useRedisUrl ? 'from URL' : connection.port,
    });

    const workerOptions: WorkerOptions = {
      connection,
      concurrency: 5, // Process up to 5 jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs
        duration: 1000, // Per second
      },
    };

    const queueName = sanitizeQueueName(jobType);
    const worker = new Worker(
      queueName,
      async (job: BullJob<JobData>) => {
        return await this.processJob(jobType, job);
      },
      workerOptions
    );

    // Add connection error logging
    worker.on('error', (error: Error) => {
      logger.error('BullMQ Worker connection error', {
        jobType,
        error: error.message,
        stack: error.stack,
        connectionType: useRedisUrl ? 'REDIS_URL' : 'host/port',
        connectionConfig: useRedisUrl
          ? 'REDIS_URL set'
          : {
              host: connection.host,
              port: connection.port,
              hasPassword: !!connection.password,
            },
      });
    });

    // Worker event handlers
    worker.on('completed', async (job: BullJob, result: JobResult) => {
      logger.info('Worker job completed', {
        jobType,
        jobId: job.id,
        result,
      });

      // Get database job ID from job data or use queue job ID
      const dbJobId = (job.data as any)?._dbJobId || job.id;

      // Update job status in database
      await this.jobService.updateJobStatus(
        dbJobId,
        JobStatus.COMPLETED,
        result
      );
    });

    worker.on('failed', async (job: BullJob | undefined, error: Error) => {
      logger.error('Worker job failed', {
        jobType,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: error.message,
        stack: error.stack,
      });

      if (job) {
        // Get database job ID from job data or use queue job ID
        const dbJobId = (job.data as any)?._dbJobId || job.id;

        // Check if job has exhausted all retries
        const maxAttempts = job.opts.attempts || 3;
        if (job.attemptsMade >= maxAttempts) {
          // Final failure - update job status
          await this.jobService.updateJobStatus(
            dbJobId,
            JobStatus.FAILED,
            undefined,
            error.message
          );
        } else {
          // Will retry - update to processing status
          await this.jobService.updateJobStatus(dbJobId, JobStatus.PROCESSING);
        }
      }
    });

    worker.on('error', (error: Error) => {
      logger.error('Worker error', {
        jobType,
        error: error.message,
        stack: error.stack,
      });
    });

    worker.on('stalled', (jobId: string) => {
      logger.warn('Worker job stalled', {
        jobType,
        jobId,
      });
    });

    this.workers.set(jobType, worker);
    logger.info('Worker created', { jobType });
  }

  private async processJob(
    jobType: JobType,
    job: BullJob<JobData>
  ): Promise<JobResult> {
    const processor = this.jobProcessors.get(jobType);

    if (!processor) {
      throw new Error(`No processor registered for job type: ${jobType}`);
    }

    // Get database job ID from job data or use queue job ID
    const dbJobId = (job.data as any)?._dbJobId || job.id;

    // Update job status to processing
    await this.jobService.updateJobStatus(dbJobId, JobStatus.PROCESSING);

    logger.info('Processing job', {
      jobType,
      jobId: job.id,
      attemptsMade: job.attemptsMade,
      data: job.data,
    });

    try {
      // Process the job
      const result = await processor(job.data);

      logger.info('Job processed successfully', {
        jobType,
        jobId: job.id,
        result,
      });

      return result;
    } catch (error) {
      logger.error('Job processing error', {
        jobType,
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Re-throw to trigger retry mechanism
      throw error;
    }
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.workers.values()).map(worker =>
      worker.close()
    );
    await Promise.all(closePromises);
    this.workers.clear();
    logger.info('All workers closed');
  }

  getWorker(jobType: JobType): Worker | undefined {
    return this.workers.get(jobType);
  }
}

export const workerService = new WorkerService();
