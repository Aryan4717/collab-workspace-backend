import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkspaceMembers1735340892006 implements MigrationInterface {
  name = 'CreateWorkspaceMembers1735340892006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if workspace_members table already exists
    const tableExists = await queryRunner.hasTable('workspace_members');
    if (tableExists) {
      return; // Skip if table already exists
    }

    // Create workspace_members table
    await queryRunner.query(`
      CREATE TABLE "workspace_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" "workspace_role_enum" NOT NULL DEFAULT 'viewer',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspace_members" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_workspace_members_workspaceId_userId" ON "workspace_members" ("workspaceId", "userId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workspace_members_userId" ON "workspace_members" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workspace_members_workspaceId" ON "workspace_members" ("workspaceId")`
    );
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD CONSTRAINT "FK_workspace_members_workspaceId"
      FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD CONSTRAINT "FK_workspace_members_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace_members" DROP CONSTRAINT IF EXISTS "FK_workspace_members_userId"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_members" DROP CONSTRAINT IF EXISTS "FK_workspace_members_workspaceId"`
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workspace_members_workspaceId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workspace_members_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workspace_members_workspaceId_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_members"`);
  }
}

