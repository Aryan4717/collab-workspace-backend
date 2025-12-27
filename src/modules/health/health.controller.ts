import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/types';

export const healthCheck = (_req: Request, res: Response): void => {
  const response: ApiResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    message: 'Service is healthy',
  };

  res.status(200).json(response);
};
