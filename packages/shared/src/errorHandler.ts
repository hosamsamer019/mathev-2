import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error('Unhandled Exception', { 
    error: err.message, 
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' && statusCode === 500 ? 'Internal Server Error' : message,
    status: statusCode
  });
}
