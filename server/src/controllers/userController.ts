import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as userService from '../services/userService.js';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(70).optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, 'Username can only contain letters, numbers, underscores, and dots')
    .optional(),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
  profilePhoto: z.string().nullable().optional(),
});

const privacySettingsSchema = z.object({
  showOnlineStatus: z.boolean().optional(),
  showLastSeen: z.boolean().optional(),
  allowMessagesFrom: z.enum(['everyone', 'contacts']).optional(),
  allowCallsFrom: z.enum(['everyone', 'contacts']).optional(),
  lastSeenVisibility: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  readReceipts: z.boolean().optional(),
  profilePhotoVisibility: z.enum(['everyone', 'contacts', 'nobody']).optional(),
});

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id.toString();
    const profile = await userService.getMyProfile(userId);
    res.status(200).json({
      success: true,
      data: { user: profile },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);
    const userId = req.user!._id.toString();
    const updatedUser = await userService.updateMyProfile(userId, validatedData);
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: updatedUser },
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

export const getPublicProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username;
    const viewerId = req.user?._id?.toString();
    const result = await userService.getPublicProfileByUsername(username, viewerId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const currentUserId = req.user!._id.toString();

    if (!query.trim()) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const results = await userService.searchUsers(query, currentUserId);
    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const targetUserId = req.params.userId;
    await userService.blockUser(currentUserId, targetUserId);
    res.status(200).json({
      success: true,
      message: 'User blocked successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const targetUserId = req.params.userId;
    await userService.unblockUser(currentUserId, targetUserId);
    res.status(200).json({
      success: true,
      message: 'User unblocked successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getPrivacy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id.toString();
    const privacy = await userService.getMyPrivacySettings(userId);
    res.status(200).json({
      success: true,
      data: { privacy },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePrivacy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = privacySettingsSchema.parse(req.body);
    const userId = req.user!._id.toString();
    const updatedPrivacy = await userService.updateMyPrivacySettings(userId, validatedData);
    res.status(200).json({
      success: true,
      message: 'Privacy settings updated successfully.',
      data: { privacy: updatedPrivacy },
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
