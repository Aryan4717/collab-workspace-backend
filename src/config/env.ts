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
}

const getEnvConfig = (): EnvConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3000', 10);
  const apiVersion = process.env.API_VERSION || 'v1';
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  const jwtRefreshSecret =
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
  const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

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
  };
};

export const env = getEnvConfig();

