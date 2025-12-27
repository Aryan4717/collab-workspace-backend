import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkspaces1735340892004 implements MigrationInterface {
  name = 'CreateWorkspaces1735340892004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if workspaces table already exists
    const tableExists = await queryRunner.hasTable('workspaces');
    if (tableExists) {
      return; // Skip if table already exists
    }

    // Create workspaces table
    await queryRunner.query(`
      CREATE TABLE "workspaces" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "ownerId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspaces" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_workspaces_ownerId_name" ON "workspaces" ("ownerId", "name")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workspaces_ownerId" ON "workspaces" ("ownerId")`
    );
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD CONSTRAINT "FK_workspaces_ownerId"
      FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP CONSTRAINT IF EXISTS "FK_workspaces_ownerId"`
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workspaces_ownerId"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_workspaces_ownerId_name"`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "workspaces"`);
  }
}
