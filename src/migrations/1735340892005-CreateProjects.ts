import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjects1735340892005 implements MigrationInterface {
  name = 'CreateProjects1735340892005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if projects table already exists
    const tableExists = await queryRunner.hasTable('projects');
    if (tableExists) {
      return; // Skip if table already exists
    }

    // Create projects table
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "workspaceId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_projects_workspaceId_name" ON "projects" ("workspaceId", "name")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_projects_workspaceId" ON "projects" ("workspaceId")`
    );
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD CONSTRAINT "FK_projects_workspaceId"
      FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_workspaceId"`
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_workspaceId"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_projects_workspaceId_name"`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
  }
}
