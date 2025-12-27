import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  nodeEnv: string;
  port: number;
  apiVersion: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  databaseUrl?: string; // Railway/production connection URL
  dbHost: string;
  dbPort: number;
  dbUsername: string;
  dbPassword: string;
  dbName: string;
  redisUrl?: string; // Railway/production connection URL
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
}

const getEnvConfig = (): EnvConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3000', 10);
  const apiVersion = process.env.API_VERSION || 'v1';
  const jwtSecret =
    process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  const jwtRefreshSecret =
    process.env.JWT_REFRESH_SECRET ||
    'your-refresh-secret-key-change-in-production';
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
  const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  // In production (Railway), prefer DATABASE_URL if available
  // In development, use individual DB connection parameters
  const databaseUrl = process.env.DATABASE_URL;
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
  const dbUsername = process.env.DB_USERNAME || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres';
  const dbName = process.env.DB_NAME || 'collab_workspace';

  // In production (Railway), prefer REDIS_URL if available
  // In development, use individual Redis connection parameters
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD;

  if (nodeEnv === 'production') {
    if (jwtSecret === 'your-secret-key-change-in-production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    if (jwtRefreshSecret === 'your-refresh-secret-key-change-in-production') {
      throw new Error('JWT_REFRESH_SECRET must be set in production');
    }
  }

  return {
    nodeEnv,
    port,
    apiVersion,
    jwtSecret,
    jwtRefreshSecret,
    jwtExpiresIn,
    jwtRefreshExpiresIn,
    databaseUrl,
    dbHost,
    dbPort,
    dbUsername,
    dbPassword,
    dbName,
    redisUrl,
    redisHost,
    redisPort,
    redisPassword,
  };
};

export const env = getEnvConfig();
