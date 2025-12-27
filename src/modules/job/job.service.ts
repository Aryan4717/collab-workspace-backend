import { AppDataSource } from '../../config/database';
import {
  Job,
  JobStatus,
  JobType,
  CreateJobDto,
  JobResponse,
} from '../../shared/entities/job.entity';
import { queueManager } from '../../config/queue';
import logger from '../../shared/utils/logger';

export class JobService {
  private jobRepository = AppDataSource.getRepository(Job);

  async createJob(dto: CreateJobDto, userId?: string): Promise<JobResponse> {
    try {
      // Check for idempotency
      if (dto.idempotencyKey) {
        const existingJob = await this.jobRepository.findOne({
          where: { idempotencyKey: dto.idempotencyKey },
        });

        if (existingJob) {
          logger.info('Idempotent job request - returning existing job', {
            idempotencyKey: dto.idempotencyKey,
            existingJobId: existingJob.id,
          });
          return this.mapToResponse(existingJob);
        }
      }

      // Create job record
      const job = this.jobRepository.create({
        type: dto.type,
        status: JobStatus.PENDING,
        data: dto.data || {},
        idempotencyKey: dto.idempotencyKey || null,
        userId: userId || dto.userId || null,
        maxAttempts: dto.maxAttempts || 3,
        attempts: 0,
      });

      await this.jobRepository.save(job);

      // Add to queue - use database job ID as BullMQ jobId for consistency
      // If idempotency key exists, use it; otherwise use the database job ID
      const queueJobId = await queueManager.addJob(
        dto.type,
        { ...dto.data, _dbJobId: job.id }, // Include DB job ID in data for reference
        {
          idempotencyKey: dto.idempotencyKey || job.id, // Use idempotency key or DB job ID
          attempts: job.maxAttempts,
        }
      );

      logger.info('Job created', {
        jobId: job.id,
        type: dto.type,
        queueJobId,
        idempotencyKey: dto.idempotencyKey,
      });

      return this.mapToResponse(job);
    } catch (error) {
      logger.error('Error creating job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        dto,
      });
      throw error;
    }
  }

  async getJobById(
    jobId: string,
    userId?: string
  ): Promise<JobResponse | null> {
    try {
      const where: any = { id: jobId };
      if (userId) {
        where.userId = userId;
      }

      const job = await this.jobRepository.findOne({ where });

      if (!job) {
        return null;
      }

      // Get queue job status for real-time updates
      // Try to find queue job by idempotency key or job ID
      const queueJobId = job.idempotencyKey || job.id;
      const queueJob = await queueManager.getJob(job.type, queueJobId);
      if (queueJob) {
        // Update job status from queue
        await this.syncJobStatus(job, queueJob);
      }

      return this.mapToResponse(job);
    } catch (error) {
      logger.error('Error getting job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
      });
      throw error;
    }
  }

  async getJobsByUser(
    userId: string,
    options?: {
      status?: JobStatus;
      type?: JobType;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ jobs: JobResponse[]; total: number }> {
    try {
      const queryBuilder = this.jobRepository
        .createQueryBuilder('job')
        .where('job.userId = :userId', { userId });

      if (options?.status) {
        queryBuilder.andWhere('job.status = :status', {
          status: options.status,
        });
      }

      if (options?.type) {
        queryBuilder.andWhere('job.type = :type', { type: options.type });
      }

      const total = await queryBuilder.getCount();

      if (options?.limit) {
        queryBuilder.limit(options.limit);
      }
      if (options?.offset) {
        queryBuilder.offset(options.offset);
      }

      queryBuilder.orderBy('job.createdAt', 'DESC');

      const jobs = await queryBuilder.getMany();

      return {
        jobs: jobs.map(job => this.mapToResponse(job)),
        total,
      };
    } catch (error) {
      logger.error('Error getting jobs by user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  async cancelJob(jobId: string, userId?: string): Promise<boolean> {
    try {
      const where: any = { id: jobId };
      if (userId) {
        where.userId = userId;
      }

      const job = await this.jobRepository.findOne({ where });

      if (!job) {
        return false;
      }

      if (
        job.status === JobStatus.COMPLETED ||
        job.status === JobStatus.CANCELLED
      ) {
        logger.warn('Cannot cancel job - already completed or cancelled', {
          jobId,
          status: job.status,
        });
        return false;
      }

      // Remove from queue - use idempotency key or job ID
      const queueJobId = job.idempotencyKey || job.id;
      await queueManager.removeJob(job.type, queueJobId);

      // Update job status
      job.status = JobStatus.CANCELLED;
      await this.jobRepository.save(job);

      logger.info('Job cancelled', {
        jobId,
        type: job.type,
      });

      return true;
    } catch (error) {
      logger.error('Error cancelling job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
      });
      throw error;
    }
  }

  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    result?: Record<string, any>,
    error?: string
  ): Promise<void> {
    try {
      const job = await this.jobRepository.findOne({ where: { id: jobId } });

      if (!job) {
        logger.warn('Job not found for status update', { jobId });
        return;
      }

      job.status = status;
      if (result) {
        job.result = result;
      }
      if (error) {
        job.error = error;
      }

      if (status === JobStatus.PROCESSING && !job.startedAt) {
        job.startedAt = new Date();
      }

      if (status === JobStatus.COMPLETED) {
        job.completedAt = new Date();
      }

      if (status === JobStatus.FAILED) {
        job.failedAt = new Date();
        job.attempts += 1;
      }

      await this.jobRepository.save(job);

      logger.debug('Job status updated', {
        jobId,
        status,
        hasResult: !!result,
        hasError: !!error,
      });
    } catch (error) {
      logger.error('Error updating job status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
        status,
      });
      throw error;
    }
  }

  private async syncJobStatus(job: Job, queueJob: any): Promise<void> {
    if (!queueJob) return;

    let status = job.status;
    let result = job.result;
    let error = job.error;

    if (await queueJob.isCompleted()) {
      status = JobStatus.COMPLETED;
      const returnValue = await queueJob.returnvalue;
      if (returnValue) {
        result = returnValue;
      }
    } else if (await queueJob.isFailed()) {
      status = JobStatus.FAILED;
      const failedReason = queueJob.failedReason;
      if (failedReason) {
        error = failedReason;
      }
    } else if (await queueJob.isActive()) {
      status = JobStatus.PROCESSING;
    } else if (await queueJob.isWaiting()) {
      status = JobStatus.PENDING;
    }

    const resultToUpdate =
      result !== undefined && result !== null ? result : undefined;
    const errorToUpdate =
      error !== undefined && error !== null ? error : undefined;

    if (
      status !== job.status ||
      (resultToUpdate !== undefined && resultToUpdate !== job.result) ||
      (errorToUpdate !== undefined && errorToUpdate !== job.error)
    ) {
      await this.updateJobStatus(job.id, status, resultToUpdate, errorToUpdate);
    }
  }

  private mapToResponse(job: Job): JobResponse {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      data: job.data,
      result: job.result,
      error: job.error,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      failedAt: job.failedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
