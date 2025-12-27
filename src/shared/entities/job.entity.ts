import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum JobType {
  EMAIL_SEND = 'email:send',
  FILE_PROCESS = 'file:process',
  DATA_EXPORT = 'data:export',
  NOTIFICATION_SEND = 'notification:send',
  WORKSPACE_BACKUP = 'workspace:backup',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  type!: JobType;

  @Column({ type: 'varchar', length: 50, default: JobStatus.PENDING })
  status!: JobStatus;

  @Column({ type: 'jsonb', nullable: true })
  data!: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  result!: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  idempotencyKey!: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'int', default: 3 })
  maxAttempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  failedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

export interface CreateJobDto {
  type: JobType;
  data?: Record<string, any>;
  idempotencyKey?: string;
  userId?: string;
  maxAttempts?: number;
}

export interface JobResponse {
  id: string;
  type: JobType;
  status: JobStatus;
  data: Record<string, any>;
  result: Record<string, any> | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

