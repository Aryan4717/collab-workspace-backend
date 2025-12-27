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
  dbHost: string;
  dbPort: number;
  dbUsername: string;
  dbPassword: string;
  dbName: string;
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
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
  const dbUsername = process.env.DB_USERNAME || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres';
  const dbName = process.env.DB_NAME || 'collab_workspace';
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
    dbHost,
    dbPort,
    dbUsername,
    dbPassword,
    dbName,
    redisHost,
    redisPort,
    redisPassword,
  };
};

export const env = getEnvConfig();
