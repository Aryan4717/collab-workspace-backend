import { JobType, JobStatus } from '../entities/job.entity';

export interface JobData {
  [key: string]: any;
}

export interface JobResult {
  [key: string]: any;
}

export interface JobOptions {
  attempts?: number;
  delay?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  idempotencyKey?: string;
}

export interface QueueJob {
  id: string;
  name: string;
  data: JobData;
  opts: JobOptions;
  timestamp: number;
  attemptsMade: number;
  delay: number;
  processedOn?: number;
  finishedOn?: number;
}

export type JobProcessor = (job: {
  data: JobData;
  id: string;
}) => Promise<JobResult>;

export interface JobHandler {
  type: JobType;
  processor: JobProcessor;
  options?: JobOptions;
}

export interface JobStatusResponse {
  id: string;
  type: JobType;
  status: JobStatus;
  progress?: number;
  data?: JobData;
  result?: JobResult;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}
