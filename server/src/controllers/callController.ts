import { Request, Response, NextFunction } from 'express';
import { callService } from '../services/callService.js';

export const getUserCalls = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any)?._id?.toString();
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const limit = parseInt(req.query.limit as string || '20', 10);
    const calls = await callService.getUserCalls(userId, limit);

    res.status(200).json({
      success: true,
      data: calls,
    });
  } catch (err: any) {
    next(err);
  }
};
