import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { AttachmentModel, IAttachmentDocument } from '../models/AttachmentModel.js';
import { ConversationModel } from '../models/ConversationModel.js';
import { canUsersInteract } from '../utils/userPrivacy.js';
import { env } from '../config/env.js';
import { cloudinaryService } from './cloudinaryService.js';

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.js', '.mjs', '.jar', '.vbs',
  '.scr', '.pif', '.com', '.hta', '.cpl', '.wsf', '.asp', '.aspx', '.php',
  '.py', '.rb', '.pl', '.dll', '.sys', '.vb', '.vbe', '.jse', '.ws',
  '.wsc', '.wsh', '.msc', '.gadget', '.msi', '.reg',
]);

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'],
  videos: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg', 'video/ogg'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/x-m4a'],
  documents: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    'text/csv',
    'text/markdown',
  ],
};

export interface UploadFileInput {
  uploaderId: string;
  conversationId: string;
  file: Express.Multer.File;
  messageId?: string;
}

export const attachmentService = {
  determineCategory(mimeType: string, extension: string): 'images' | 'videos' | 'audio' | 'documents' | 'files' {
    const mime = (mimeType || '').toLowerCase();
    const ext = (extension || '').toLowerCase();

    if (ALLOWED_MIME_TYPES.images.includes(mime) || mime.startsWith('image/')) {
      return 'images';
    }
    if (ALLOWED_MIME_TYPES.videos.includes(mime) || mime.startsWith('video/')) {
      return 'videos';
    }
    if (ALLOWED_MIME_TYPES.audio.includes(mime) || mime.startsWith('audio/')) {
      return 'audio';
    }
    if (ALLOWED_MIME_TYPES.documents.includes(mime) || ext === '.pdf' || ext === '.doc' || ext === '.docx' || ext === '.txt') {
      return 'documents';
    }
    return 'files';
  },

  getMaxSizeForCategory(category: 'images' | 'videos' | 'audio' | 'documents' | 'files'): number {
    switch (category) {
      case 'images':
        return env.MAX_IMAGE_SIZE_MB * 1024 * 1024;
      case 'videos':
        return env.MAX_VIDEO_SIZE_MB * 1024 * 1024;
      case 'audio':
        return env.MAX_AUDIO_SIZE_MB * 1024 * 1024;
      case 'documents':
        return env.MAX_DOCUMENT_SIZE_MB * 1024 * 1024;
      case 'files':
      default:
        return env.MAX_FILE_SIZE_MB * 1024 * 1024;
    }
  },

  sanitizeFilename(originalName: string): { safeName: string; extension: string } {
    if (!originalName) {
      return { safeName: 'unnamed_file', extension: '' };
    }

    if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\') || originalName.includes('\0')) {
      originalName = path.basename(originalName).replace(/(\.\.[\/\\])+/g, '');
    }

    const rawExt = path.extname(originalName).toLowerCase();
    const nameWithoutExt = path.basename(originalName, rawExt).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const safeName = `${nameWithoutExt}${rawExt}`;

    return { safeName, extension: rawExt };
  },

  async uploadAttachment(input: UploadFileInput) {
    const { uploaderId, conversationId, file, messageId } = input;

    if (!file || !file.buffer) {
      throw new Error('No file provided for upload.');
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(uploaderId)) {
      throw new Error('Invalid conversation or user ID.');
    }

    // Verify conversation
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      const err: any = new Error('Conversation not found.');
      err.status = 404;
      throw err;
    }

    // Check membership
    const isParticipant = conversation.participants.some(
      p => p.userId && p.userId.toString() === uploaderId
    );
    if (!isParticipant) {
      const err: any = new Error('User is not a participant in this conversation.');
      err.status = 403;
      throw err;
    }

    // Check privacy / blocking with recipient
    const recipient = conversation.participants.find(
      p => p.userId && p.userId.toString() !== uploaderId
    );
    if (recipient) {
      const canInteract = await canUsersInteract(uploaderId, recipient.userId.toString());
      if (!canInteract) {
        const err: any = new Error('Cannot send files to this user due to privacy or block settings.');
        err.status = 403;
        throw err;
      }
    }

    // Sanitize filename & extension
    const { safeName, extension } = this.sanitizeFilename(file.originalname);

    if (DANGEROUS_EXTENSIONS.has(extension)) {
      const err: any = new Error(`File type '${extension}' is not allowed for security reasons.`);
      err.status = 400;
      throw err;
    }

    // Determine category & size validation
    const category = this.determineCategory(file.mimetype, extension);
    const maxSize = this.getMaxSizeForCategory(category);

    if (file.size > maxSize) {
      const maxMb = Math.round(maxSize / (1024 * 1024));
      const err: any = new Error(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds limit of ${maxMb}MB for ${category}.`);
      err.status = 400;
      throw err;
    }

    // Calculate SHA-256 checksum
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    let fileUrl = '';
    let thumbnailUrl: string | null = null;
    let durationSeconds = 0;
    let cloudinaryPublicId: string | null = null;
    let storagePath = '';
    let uniqueStorageName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;

    // Cloudinary Primary Upload (if configured)
    if (cloudinaryService.isConfigured()) {
      try {
        const cldResult = await cloudinaryService.uploadFileBuffer(file.buffer, {
          filename: safeName,
          mimeType: file.mimetype,
          folder: `${env.CLOUDINARY_FOLDER}/${category}`,
        });

        fileUrl = cldResult.fileUrl;
        thumbnailUrl = cldResult.thumbnailUrl || null;
        durationSeconds = cldResult.durationSeconds || 0;
        cloudinaryPublicId = cldResult.publicId;
      } catch (cldErr: any) {
        console.warn('[Cloudinary Upload Failed, falling back to local storage]:', cldErr.message);
      }
    }

    // Local Disk Fallback if Cloudinary is not configured or fails
    if (!fileUrl) {
      const targetDir = path.resolve(process.cwd(), env.UPLOAD_DIR, category);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      storagePath = path.join(targetDir, uniqueStorageName);
      await fs.promises.writeFile(storagePath, file.buffer);
    }

    let attachmentDoc: IAttachmentDocument;
    try {
      attachmentDoc = await AttachmentModel.create({
        uploaderId: new mongoose.Types.ObjectId(uploaderId),
        uploadedBy: new mongoose.Types.ObjectId(uploaderId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        messageId: messageId && mongoose.Types.ObjectId.isValid(messageId) ? new mongoose.Types.ObjectId(messageId) : null,
        originalName: safeName,
        storedFileName: uniqueStorageName,
        storageName: uniqueStorageName,
        storagePath: storagePath,
        mimeType: file.mimetype || 'application/octet-stream',
        fileSize: file.size,
        size: file.size,
        checksum,
        fileUrl: fileUrl || '/api/attachments/placeholder',
        thumbnailUrl,
        durationSeconds,
        cloudinaryPublicId,
      });

      if (!fileUrl) {
        attachmentDoc.fileUrl = `/api/attachments/${attachmentDoc._id.toString()}`;
        await attachmentDoc.save();
      }
    } catch (dbErr) {
      if (storagePath && fs.existsSync(storagePath)) {
        try { fs.unlinkSync(storagePath); } catch (_) {}
      }
      throw dbErr;
    }

    return this.formatAttachment(attachmentDoc);
  },

  async getAttachmentForUser(attachmentId: string, userId?: string) {
    if (!mongoose.Types.ObjectId.isValid(attachmentId)) {
      const err: any = new Error('Invalid attachment ID.');
      err.status = 400;
      throw err;
    }

    const attachment = await AttachmentModel.findById(attachmentId);
    if (!attachment) {
      const err: any = new Error('Attachment not found.');
      err.status = 404;
      throw err;
    }

    if (attachment.fileUrl && (attachment.fileUrl.startsWith('http://') || attachment.fileUrl.startsWith('https://'))) {
      return {
        attachment,
        isRemoteUrl: true,
        fileUrl: attachment.fileUrl,
      };
    }

    if (userId) {
      const conversation = await ConversationModel.findById(attachment.conversationId);
      if (conversation) {
        const isParticipant = conversation.participants.some(
          p => p.userId && p.userId.toString() === userId
        );
        if (!isParticipant) {
          const err: any = new Error('Unauthorized: You are not a member of this conversation.');
          err.status = 403;
          throw err;
        }
      }
    }

    if (!attachment.storagePath || !fs.existsSync(attachment.storagePath)) {
      const err: any = new Error('File not found on storage server.');
      err.status = 404;
      throw err;
    }

    return {
      attachment,
      isRemoteUrl: false,
      filePath: attachment.storagePath,
    };
  },

  async deleteAttachment(attachmentId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(attachmentId) || !mongoose.Types.ObjectId.isValid(userId)) {
      const err: any = new Error('Invalid attachment or user ID.');
      err.status = 400;
      throw err;
    }

    const attachment = await AttachmentModel.findById(attachmentId);
    if (!attachment) {
      const err: any = new Error('Attachment not found.');
      err.status = 404;
      throw err;
    }

    // Verify membership
    const conversation = await ConversationModel.findById(attachment.conversationId);
    if (!conversation) {
      const err: any = new Error('Associated conversation not found.');
      err.status = 404;
      throw err;
    }

    const isParticipant = conversation.participants.some(
      p => p.userId && p.userId.toString() === userId
    );
    if (!isParticipant) {
      const err: any = new Error('Unauthorized to delete attachment.');
      err.status = 403;
      throw err;
    }

    if (attachment.uploaderId.toString() !== userId) {
      const err: any = new Error('Only the uploader can delete this attachment.');
      err.status = 403;
      throw err;
    }

    // Delete from Cloudinary if stored there
    if (attachment.cloudinaryPublicId) {
      const isVideo = attachment.mimeType.startsWith('video/') || attachment.mimeType.startsWith('audio/');
      const isImage = attachment.mimeType.startsWith('image/');
      const resourceType = isImage ? 'image' : isVideo ? 'video' : 'raw';
      await cloudinaryService.deleteFile(attachment.cloudinaryPublicId, resourceType);
    }

    // Delete physical file if local
    if (attachment.storagePath && fs.existsSync(attachment.storagePath)) {
      try {
        fs.unlinkSync(attachment.storagePath);
      } catch (_) {}
    }

    await AttachmentModel.findByIdAndDelete(attachmentId);

    return { success: true, attachmentId };
  },

  formatAttachment(doc: IAttachmentDocument) {
    return {
      id: doc._id.toString(),
      originalName: doc.originalName,
      storedFileName: doc.storedFileName,
      mimeType: doc.mimeType,
      size: doc.fileSize || doc.size,
      fileSize: doc.fileSize || doc.size,
      checksum: doc.checksum || null,
      fileUrl: doc.fileUrl,
      thumbnailUrl: doc.thumbnailUrl || null,
      durationSeconds: doc.durationSeconds || 0,
      createdAt: doc.createdAt,
    };
  },
};
