import { DataSource, DataSourceOptions } from 'typeorm';
import { env } from './env';
import { User } from '../shared/entities/user.entity';
import { RefreshToken } from '../shared/entities/refresh-token.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: env.dbHost,
  port: env.dbPort,
  username: env.dbUsername,
  password: env.dbPassword,
  database: env.dbName,
  entities: [User, RefreshToken],
  synchronize: env.nodeEnv !== 'production', // Auto-sync in dev, use migrations in production
  logging: env.nodeEnv === 'development',
  migrations: ['dist/migrations/*.js'],
  migrationsTableName: 'migrations',
};

export const AppDataSource = new DataSource(dataSourceOptions);

