import { Request, Response } from 'express';
import { JobService } from './job.service';
import {
  CreateJobDto,
  JobType,
  JobStatus,
} from '../../shared/entities/job.entity';
import { ApiResponse } from '../../shared/types';
import logger from '../../shared/utils/logger';

const jobService = new JobService();

export class JobController {
  async createJob(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const dto: CreateJobDto = req.body;

      // Validate job type
      if (!Object.values(JobType).includes(dto.type)) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid job type. Valid types: ${Object.values(JobType).join(', ')}`,
        };
        res.status(400).json(response);
        return;
      }

      const job = await jobService.createJob(dto, userId);

      const response: ApiResponse = {
        success: true,
        data: job,
        message: 'Job created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Error in createJob controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create job',
      };

      res.status(500).json(response);
    }
  }

  async getJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = (req as any).user?.userId;

      const job = await jobService.getJobById(jobId, userId);

      if (!job) {
        const response: ApiResponse = {
          success: false,
          error: 'Job not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: job,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error in getJob controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId: req.params.jobId,
      });

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get job',
      };

      res.status(500).json(response);
    }
  }

  async getJobs(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: 'User ID required',
        };
        res.status(401).json(response);
        return;
      }

      const status = req.query.status as JobStatus | undefined;
      const type = req.query.type as JobType | undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 20;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string, 10)
        : 0;

      const result = await jobService.getJobsByUser(userId, {
        status,
        type,
        limit,
        offset,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          jobs: result.jobs,
          total: result.total,
          limit,
          offset,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error in getJobs controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get jobs',
      };

      res.status(500).json(response);
    }
  }

  async cancelJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = (req as any).user?.userId;

      const cancelled = await jobService.cancelJob(jobId, userId);

      if (!cancelled) {
        const response: ApiResponse = {
          success: false,
          error: 'Job not found or cannot be cancelled',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Job cancelled successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error in cancelJob controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId: req.params.jobId,
      });

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel job',
      };

      res.status(500).json(response);
    }
  }
}
