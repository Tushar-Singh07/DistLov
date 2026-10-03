import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import { findValidSession } from '../services/sessionService.js';
import { UserModel } from '../models/UserModel.js';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.cookies?.access_token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in.',
        errors: [],
      });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.',
        errors: [],
      });
    }

    const session = await findValidSession(payload.sessionId);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired or been revoked. Please sign in again.',
        errors: [],
      });
    }

    const user = await UserModel.findById(payload.userId);
    if (!user || !user.isActive || user.isBlocked) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive or suspended.',
        errors: [],
      });
    }

    req.user = user;
    req.sessionDoc = session;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.cookies?.access_token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        const session = await findValidSession(payload.sessionId);
        if (session) {
          const user = await UserModel.findById(payload.userId);
          if (user && user.isActive && !user.isBlocked) {
            req.user = user;
            req.sessionDoc = session;
          }
        }
      }
    }
    next();
  } catch (error) {
    next();
  }
};
