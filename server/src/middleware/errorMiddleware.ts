import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export interface CustomError extends Error {
  statusCode?: number;
  errors?: any[];
}

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    errors: []
  });
};

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
