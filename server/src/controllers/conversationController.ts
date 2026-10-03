import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { conversationService } from '../services/conversationService.js';
import { messageService } from '../services/messageService.js';

const createDirectSchema = z.object({
  userId: z.string().min(1, 'Target userId is required'),
});

const getMessagesQuerySchema = z.object({
  limit: z.string().optional(),
  before: z.string().optional(),
});

export const getMyConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const conversations = await conversationService.getUserConversations(currentUserId);

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

export const createOrGetDirectConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const parsed = createDirectSchema.parse(req.body);

    const conversation = await conversationService.getOrCreateDirectConversation(
      currentUserId,
      parsed.userId
    );

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};

export const getConversationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const { conversationId } = req.params;

    const conversation = await conversationService.getConversationById(conversationId, currentUserId);

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const { conversationId } = req.params;
    const query = getMessagesQuerySchema.parse(req.query);

    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const result = await messageService.getMessagesHistory(
      conversationId,
      currentUserId,
      limit,
      query.before
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};

export const markConversationRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const { conversationId } = req.params;

    const result = await messageService.markMessagesRead(conversationId, currentUserId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const clearConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const { conversationId } = req.params;

    const result = await messageService.clearConversationMessages(conversationId, currentUserId);

    try {
      const { getIO } = await import('../sockets/socketManager.js');
      getIO().to(`user:${currentUserId}`).emit('conversation:cleared', {
        conversationId,
        clearedByUserId: currentUserId,
      });
    } catch (_) {}

    res.status(200).json({
      success: true,
      message: 'Chat cleared successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
