import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  nodeEnv: string;
  port: number;
  apiVersion: string;
}

const getEnvConfig = (): EnvConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3000', 10);
  const apiVersion = process.env.API_VERSION || 'v1';

  return {
    nodeEnv,
    port,
    apiVersion,
  };
};

export const env = getEnvConfig();

