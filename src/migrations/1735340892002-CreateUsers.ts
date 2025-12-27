import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1735340892002 implements MigrationInterface {
  name = 'CreateUsers1735340892002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if users table already exists
    const tableExists = await queryRunner.hasTable('users');
    if (tableExists) {
      return; // Skip if table already exists
    }

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "password" character varying(255) NOT NULL,
        "name" character varying(255) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);
    
    // Create index if it doesn't exist
    const indexExists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_users_email'
    `);
    if (indexExists.length === 0) {
      await queryRunner.query(
        `CREATE INDEX "IDX_users_email" ON "users" ("email")`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}

