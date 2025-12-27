import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobs1735340892008 implements MigrationInterface {
  name = 'CreateJobs1735340892008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if jobs table already exists
    const tableExists = await queryRunner.hasTable('jobs');
    if (tableExists) {
      return; // Skip if table already exists
    }

    // Create jobs table
    await queryRunner.query(`
      CREATE TABLE "jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying(100) NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'pending',
        "data" jsonb,
        "result" jsonb,
        "error" text,
        "idempotencyKey" character varying(255),
        "userId" uuid,
        "attempts" integer NOT NULL DEFAULT 0,
        "maxAttempts" integer NOT NULL DEFAULT 3,
        "startedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "failedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_jobs_idempotencyKey" UNIQUE ("idempotencyKey"),
        CONSTRAINT "PK_jobs" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "jobs"`);
  }
}
