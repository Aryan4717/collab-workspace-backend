import { DataSource, DataSourceOptions } from 'typeorm';
import { env } from './env';
import { User } from '../shared/entities/user.entity';
import { RefreshToken } from '../shared/entities/refresh-token.entity';
import { Workspace } from '../shared/entities/workspace.entity';
import { Project } from '../shared/entities/project.entity';
import { WorkspaceMember } from '../shared/entities/workspace-member.entity';
import { WorkspaceInvite } from '../shared/entities/workspace-invite.entity';
import { Job } from '../shared/entities/job.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: env.dbHost,
  port: env.dbPort,
  username: env.dbUsername,
  password: env.dbPassword,
  database: env.dbName,
  entities: [User, RefreshToken, Workspace, Project, WorkspaceMember, WorkspaceInvite, Job],
  synchronize: env.nodeEnv !== 'production', // Auto-sync in dev and test (test !== production)
  logging: false, // Disable SQL query logging
  migrations: ['dist/migrations/*.js'],
  migrationsTableName: 'migrations',
};

export const AppDataSource = new DataSource(dataSourceOptions);

