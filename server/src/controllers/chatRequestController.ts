import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { chatRequestService } from '../services/chatRequestService.js';

const sendRequestSchema = z.object({
  receiverId: z.string().min(1, 'Receiver ID is required'),
  message: z.string().max(300, 'Message cannot exceed 300 characters').optional(),
});

export const sendChatRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const senderId = req.user!._id.toString();
    const { receiverId, message } = sendRequestSchema.parse(req.body);

    const result = await chatRequestService.sendChatRequest(senderId, receiverId, message);

    res.status(201).json({
      success: true,
      message: (result as any).autoAccepted ? 'Chat request auto-accepted!' : 'Chat request sent successfully.',
      data: result,
    });
  } catch (error) {
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

export const getPendingRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id.toString();
    const result = await chatRequestService.getPendingRequests(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const acceptChatRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id.toString();
    const { requestId } = req.params;

    const result = await chatRequestService.acceptChatRequest(requestId, userId);

    res.status(200).json({
      success: true,
      message: 'Chat request accepted!',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const declineChatRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id.toString();
    const { requestId } = req.params;

    const result = await chatRequestService.declineChatRequest(requestId, userId);

    res.status(200).json({
      success: true,
      message: 'Chat request declined.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelChatRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id.toString();
    const { requestId } = req.params;

    const result = await chatRequestService.cancelChatRequest(requestId, userId);

    res.status(200).json({
      success: true,
      message: 'Chat request cancelled.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getChatStatusWithUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id.toString();
    const { targetUserId } = req.params;

    const result = await chatRequestService.getChatStatusWithUser(userId, targetUserId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
