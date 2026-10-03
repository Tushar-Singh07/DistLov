import { Request, Response } from 'express';
import mongoose from 'mongoose';

export const getHealth = (req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  res.status(200).json({
    success: true,
    message: 'SecureConnect API is running',
    data: {
      status: 'healthy',
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
};
