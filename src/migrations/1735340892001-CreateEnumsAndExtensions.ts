import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnumsAndExtensions1735340892001 implements MigrationInterface {
  name = 'CreateEnumsAndExtensions1735340892001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension (if not already enabled)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create enum types (skip if they already exist)
    const workspaceRoleEnumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'workspace_role_enum'
    `);
    if (workspaceRoleEnumExists.length === 0) {
      await queryRunner.query(
        `CREATE TYPE "workspace_role_enum" AS ENUM('owner', 'collaborator', 'viewer')`
      );
    }

    const inviteStatusEnumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'invite_status_enum'
    `);
    if (inviteStatusEnumExists.length === 0) {
      await queryRunner.query(
        `CREATE TYPE "invite_status_enum" AS ENUM('pending', 'accepted', 'declined', 'expired')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "invite_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "workspace_role_enum"`);
  }
}

