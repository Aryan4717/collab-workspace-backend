import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkspaceInvites1735340892007 implements MigrationInterface {
  name = 'CreateWorkspaceInvites1735340892007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if workspace_invites table already exists
    const tableExists = await queryRunner.hasTable('workspace_invites');
    if (tableExists) {
      return; // Skip if table already exists
    }

    // Create workspace_invites table
    await queryRunner.query(`
      CREATE TABLE "workspace_invites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "email" character varying(255) NOT NULL,
        "role" "workspace_role_enum" NOT NULL DEFAULT 'viewer',
        "invitedById" uuid NOT NULL,
        "token" character varying(255) NOT NULL,
        "status" "invite_status_enum" NOT NULL DEFAULT 'pending',
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_workspace_invites_token" UNIQUE ("token"),
        CONSTRAINT "PK_workspace_invites" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_workspace_invites_workspaceId_email" ON "workspace_invites" ("workspaceId", "email")`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_workspace_invites_token" ON "workspace_invites" ("token")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workspace_invites_workspaceId" ON "workspace_invites" ("workspaceId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workspace_invites_email" ON "workspace_invites" ("email")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workspace_invites_status" ON "workspace_invites" ("status")`
    );
    await queryRunner.query(`
      ALTER TABLE "workspace_invites"
      ADD CONSTRAINT "FK_workspace_invites_workspaceId"
      FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace_invites"
      ADD CONSTRAINT "FK_workspace_invites_invitedById"
      FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace_invites" DROP CONSTRAINT IF EXISTS "FK_workspace_invites_invitedById"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_invites" DROP CONSTRAINT IF EXISTS "FK_workspace_invites_workspaceId"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_workspace_invites_status"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_workspace_invites_email"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_workspace_invites_workspaceId"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_workspace_invites_token"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_workspace_invites_workspaceId_email"`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_invites"`);
  }
}
