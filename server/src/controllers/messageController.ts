import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { messageService } from '../services/messageService.js';

const editMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
});

const reactionSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required'),
});

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const { conversationId, content, replyToMessageId, attachmentIds, messageType } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'conversationId is required' });
    }

    const message = await messageService.createMessage(
      conversationId,
      currentUserId,
      content,
      replyToMessageId,
      attachmentIds,
      messageType
    );

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    next(error);
  }
};

export const editMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const { messageId } = req.params;
    const parsed = editMessageSchema.parse(req.body);

    const updatedMessage = await messageService.editMessage(messageId, currentUserId, parsed.content);

    res.status(200).json({
      success: true,
      data: updatedMessage,
    });
  } catch (error: any) {
    if (error.status === 403) {
      return res.status(403).json({ success: false, message: error.message });
    }
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

export const deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const { messageId } = req.params;

    const deletedMessage = await messageService.deleteMessage(messageId, currentUserId);

    res.status(200).json({
      success: true,
      data: deletedMessage,
    });
  } catch (error: any) {
    if (error.status === 403) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const addReaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const { messageId } = req.params;
    const parsed = reactionSchema.parse(req.body);

    const message = await messageService.addReaction(messageId, currentUserId, parsed.emoji);

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid emoji format',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};

export const removeReaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const { messageId, emoji } = req.params;

    const message = await messageService.removeReaction(messageId, currentUserId, emoji);

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

export const searchMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!._id.toString();
    const { conversationId } = req.params;
    const queryStr = req.query.q as string;

    const results = await messageService.searchMessages(conversationId, currentUserId, queryStr || '');

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};
