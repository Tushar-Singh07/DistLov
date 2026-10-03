import { Request, Response, NextFunction } from 'express';
import { attachmentService } from '../services/attachmentService.js';
import fs from 'fs';

export const uploadAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any)?._id?.toString();
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const conversationId = req.body.conversationId;
    const messageId = req.body.messageId;

    if (!conversationId) {
      res.status(400).json({ success: false, message: 'conversationId is required' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'file parameter is required' });
      return;
    }

    const attachment = await attachmentService.uploadAttachment({
      uploaderId: userId,
      conversationId,
      file: req.file,
      messageId,
    });

    res.status(201).json({
      success: true,
      attachment,
    });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};

export const getAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any)?._id?.toString();
    const attachmentId = req.params.attachmentId;
    const isDownload = req.query.download === 'true';

    const result = await attachmentService.getAttachmentForUser(attachmentId, userId);
    const { attachment } = result;

    if (result.isRemoteUrl && result.fileUrl) {
      res.redirect(result.fileUrl);
      return;
    }

    const filePath = result.filePath!;

    const isPreviewable = attachment.mimeType.startsWith('image/') ||
      attachment.mimeType.startsWith('video/') ||
      attachment.mimeType.startsWith('audio/') ||
      attachment.mimeType === 'application/pdf';

    const dispositionType = (isDownload || !isPreviewable) ? 'attachment' : 'inline';
    const encodedFilename = encodeURIComponent(attachment.originalName);

    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Type', attachment.mimeType || 'image/jpeg');
    res.setHeader('Content-Length', attachment.fileSize || attachment.size);
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${encodedFilename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (streamErr) => {
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error streaming attachment file' });
      }
    });

    fileStream.pipe(res);
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};

export const deleteAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any)?._id?.toString();
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const attachmentId = req.params.attachmentId;
    await attachmentService.deleteAttachment(attachmentId, userId);

    res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};
