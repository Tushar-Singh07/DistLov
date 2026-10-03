import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService.js';
import { setAuthCookies, clearAuthCookies, verifyRefreshToken } from '../utils/token.js';
import { serializeUser } from '../utils/userSerializer.js';
import { findValidSession, createSession } from '../services/sessionService.js';
import { UserModel } from '../models/UserModel.js';

// Zod Validation Schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(70),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30).regex(/^[a-zA-Z0-9_.]+$/, 'Username format invalid'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const result = await authService.registerUser(validatedData);
    res.status(201).json({
      success: true,
      message: result.message,
      data: { email: result.email },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failure',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    const user = await authService.verifyUserEmail(token);
    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      data: { user },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failure',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    const { user, sessionResult } = await authService.loginUser({
      email: validatedData.email,
      password: validatedData.password,
      ipAddress,
      userAgent,
    });

    setAuthCookies(res, sessionResult.accessToken, sessionResult.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: { user },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failure',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.sessionDoc?.sessionId;
    const userId = req.user?._id?.toString();

    await authService.logoutUser(sessionId || '', userId);
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated',
      });
    }
    res.status(200).json({
      success: true,
      data: { user: serializeUser(req.user) },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token missing' });
    }

    const payload = verifyRefreshToken(token);
    if (!payload) {
      clearAuthCookies(res);
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const session = await findValidSession(payload.sessionId);
    if (!session) {
      clearAuthCookies(res);
      return res.status(401).json({ success: false, message: 'Session revoked or expired' });
    }

    const user = await UserModel.findById(payload.userId);
    if (!user || !user.isActive || user.isBlocked) {
      clearAuthCookies(res);
      return res.status(401).json({ success: false, message: 'User account disabled' });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    // Token Rotation
    await authService.logoutUser(session.sessionId);
    const newSessionResult = await createSession({
      userId: user._id as any,
      userAgent,
      ipAddress,
    });

    setAuthCookies(res, newSessionResult.accessToken, newSessionResult.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: { user: serializeUser(user) },
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.requestPasswordReset(email);
    res.status(200).json({
      success: true,
      message: 'If an account exists for this email, password reset instructions have been sent.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failure',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.resetUserPassword(token, password);
    clearAuthCookies(res);
    res.status(200).json({
      success: true,
      message: 'Password reset successful. Please sign in with your new password.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failure',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};
