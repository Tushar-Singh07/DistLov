import mongoose from 'mongoose';
import { MessageModel, IMessageDocument, MessageType } from '../models/MessageModel.js';
import { ConversationModel } from '../models/ConversationModel.js';
import { UserModel } from '../models/UserModel.js';
import { AttachmentModel } from '../models/AttachmentModel.js';
import { canUsersInteract } from '../utils/userPrivacy.js';
import { env } from '../config/env.js';

export const ALLOWED_REACTIONS = ['❤️', '😂', '👍', '👎', '😮', '😢', '🔥', '👏'];

export const messageService = {
  async createMessage(
    conversationId: string,
    senderId: string,
    content: string,
    replyToMessageId?: string,
    attachmentIds?: string[],
    overrideMessageType?: MessageType
  ) {
    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(senderId)) {
      throw new Error('Invalid conversation or sender ID.');
    }

    const trimmedContent = (content || '').trim();
    const hasAttachments = Array.isArray(attachmentIds) && attachmentIds.length > 0;

    if (!trimmedContent && !hasAttachments) {
      throw new Error('Message content or attachment is required.');
    }

    if (trimmedContent.length > 5000) {
      throw new Error('Message content exceeds maximum limit of 5000 characters.');
    }

    if (hasAttachments && attachmentIds.length > env.MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new Error(`Maximum ${env.MAX_ATTACHMENTS_PER_MESSAGE} attachments allowed per message.`);
    }

    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const senderParticipant = conversation.participants.find(
      p => p.userId && p.userId.toString() === senderId
    );

    if (!senderParticipant) {
      throw new Error('Sender is not a participant in this conversation.');
    }

    // Identify recipient in direct chat
    const recipientParticipant = conversation.participants.find(
      p => p.userId && p.userId.toString() !== senderId
    );

    if (recipientParticipant) {
      const recipientId = recipientParticipant.userId.toString();
      const canInteract = await canUsersInteract(senderId, recipientId);
      if (!canInteract) {
        throw new Error('Cannot send message to this user due to privacy or block settings.');
      }
    }

    let replyToObjectId: mongoose.Types.ObjectId | null = null;
    if (replyToMessageId) {
      if (!mongoose.Types.ObjectId.isValid(replyToMessageId)) {
        throw new Error('Invalid replyToMessageId.');
      }
      const originalMsg = await MessageModel.findById(replyToMessageId);
      if (!originalMsg || originalMsg.conversationId.toString() !== conversationId) {
        throw new Error('Original message for reply not found in this conversation.');
      }
      replyToObjectId = originalMsg._id as mongoose.Types.ObjectId;
    }

    // Verify attachments & determine message type
    const attachmentObjectIds: mongoose.Types.ObjectId[] = [];
    let derivedMessageType: MessageType = overrideMessageType || 'text';

    if (hasAttachments) {
      const fetchedAttachments = await AttachmentModel.find({
        _id: { $in: attachmentIds.map(id => new mongoose.Types.ObjectId(id)) },
        conversationId: new mongoose.Types.ObjectId(conversationId),
      });

      if (fetchedAttachments.length !== attachmentIds.length) {
        throw new Error('One or more attachments not found or do not belong to this conversation.');
      }

      for (const att of fetchedAttachments) {
        attachmentObjectIds.push(att._id as mongoose.Types.ObjectId);
      }

      if (!overrideMessageType) {
        const firstMime = fetchedAttachments[0].mimeType.toLowerCase();
        if (firstMime.startsWith('image/')) {
          derivedMessageType = 'image';
        } else if (firstMime.startsWith('video/')) {
          derivedMessageType = 'video';
        } else if (firstMime.startsWith('audio/')) {
          derivedMessageType = 'audio';
        } else if (firstMime.includes('pdf') || firstMime.includes('word') || firstMime.includes('excel') || firstMime.includes('text')) {
          derivedMessageType = 'document';
        } else {
          derivedMessageType = 'file';
        }
      }
    }

    // Save message
    const message = await MessageModel.create({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      senderId: new mongoose.Types.ObjectId(senderId),
      messageType: derivedMessageType,
      content: trimmedContent,
      replyTo: replyToObjectId,
      replyToMessageId: replyToObjectId,
      attachments: attachmentObjectIds,
      status: 'sent',
    });

    // Link messageId in attachments
    if (attachmentObjectIds.length > 0) {
      await AttachmentModel.updateMany(
        { _id: { $in: attachmentObjectIds } },
        { $set: { messageId: message._id } }
      );
    }

    // Update conversation metadata
    conversation.lastMessage = message._id as mongoose.Types.ObjectId;
    conversation.lastMessageAt = message.createdAt;
    conversation.updatedAt = message.createdAt;

    // Increment recipient's unread count
    if (recipientParticipant) {
      const recipientId = recipientParticipant.userId.toString();
      for (const p of conversation.participants) {
        if (p.userId && p.userId.toString() === recipientId) {
          p.unreadCount = (p.unreadCount || 0) + 1;
        }
      }
    }

    await conversation.save();

    return await this.formatMessageWithPopulate(message);
  },

  async editMessage(messageId: string, senderId: string, newContent: string) {
    if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(senderId)) {
      throw new Error('Invalid message or sender ID.');
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      throw new Error('Message not found.');
    }

    if (message.senderId.toString() !== senderId) {
      const err: any = new Error('Only the original sender can edit this message.');
      err.status = 403;
      throw err;
    }

    if (message.isDeleted) {
      throw new Error('Cannot edit a deleted message.');
    }

    // Check edit window (default 15 mins)
    const diffMinutes = (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60);
    if (diffMinutes > env.MESSAGE_EDIT_WINDOW_MINUTES) {
      throw new Error(`Message edit window of ${env.MESSAGE_EDIT_WINDOW_MINUTES} minutes has expired.`);
    }

    const trimmed = (newContent || '').trim();
    if (!trimmed) {
      throw new Error('Updated message content cannot be empty.');
    }

    if (trimmed.length > 5000) {
      throw new Error('Message content exceeds maximum limit of 5000 characters.');
    }

    message.content = trimmed;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();
    return await this.formatMessageWithPopulate(message);
  },

  async deleteMessage(messageId: string, senderId: string) {
    if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(senderId)) {
      throw new Error('Invalid message or sender ID.');
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      throw new Error('Message not found.');
    }

    if (message.senderId.toString() !== senderId) {
      const err: any = new Error('Only the original sender can delete this message.');
      err.status = 403;
      throw err;
    }

    if (!message.isDeleted) {
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();
    }

    return await this.formatMessageWithPopulate(message);
  },

  async addReaction(messageId: string, userId: string, emoji: string) {
    if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid message or user ID.');
    }

    const trimmedEmoji = (emoji || '').trim();
    if (!trimmedEmoji || trimmedEmoji.length > 12) {
      throw new Error('Invalid emoji reaction');
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      throw new Error('Message not found.');
    }

    const conversation = await ConversationModel.findById(message.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const isParticipant = conversation.participants.some(
      p => p.userId && p.userId.toString() === userId
    );
    if (!isParticipant) {
      throw new Error('Unauthorized to react to message in this conversation.');
    }

    const userObjId = new mongoose.Types.ObjectId(userId);

    // Prevent duplicate same reaction by same user
    const existingIndex = message.reactions.findIndex(
      r => r.userId.toString() === userId && r.emoji === trimmedEmoji
    );

    if (existingIndex === -1) {
      message.reactions.push({
        userId: userObjId,
        emoji: trimmedEmoji,
        createdAt: new Date(),
      });
      await message.save();
    }

    return await this.formatMessageWithPopulate(message);
  },

  async removeReaction(messageId: string, userId: string, emoji: string) {
    if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid message or user ID.');
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      throw new Error('Message not found.');
    }

    const conversation = await ConversationModel.findById(message.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const isParticipant = conversation.participants.some(
      p => p.userId && p.userId.toString() === userId
    );
    if (!isParticipant) {
      throw new Error('Unauthorized to remove reaction.');
    }

    const trimmedEmoji = (emoji || '').trim();
    message.reactions = message.reactions.filter(
      r => !(r.userId.toString() === userId && r.emoji === trimmedEmoji)
    );

    await message.save();
    return await this.formatMessageWithPopulate(message);
  },

  async searchMessages(conversationId: string, userId: string, queryStr: string) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new Error('Invalid conversation ID.');
    }

    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const participant = conversation.participants.find(
      p => p.userId && p.userId.toString() === userId
    );
    if (!participant) {
      throw new Error('Unauthorized to search messages in this conversation.');
    }

    const q = (queryStr || '').trim();
    if (!q || q.length > 100) {
      throw new Error('Search query must be between 1 and 100 characters.');
    }

    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter: any = {
      conversationId: new mongoose.Types.ObjectId(conversationId),
      isDeleted: false,
      content: { $regex: new RegExp(escapedQuery, 'i') },
    };

    if (participant.clearedAt) {
      filter.createdAt = { $gt: participant.clearedAt };
    }

    const docs = await MessageModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    return await Promise.all(docs.map(doc => this.formatMessageWithPopulate(doc)));
  },

  async getMessagesHistory(conversationId: string, userId: string, limitNum: number = 50, beforeCursor?: string) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new Error('Invalid conversation ID.');
    }

    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const participant = conversation.participants.find(
      p => p.userId && p.userId.toString() === userId
    );
    if (!participant) {
      throw new Error('Unauthorized access to conversation messages.');
    }

    const limit = Math.max(1, Math.min(100, limitNum));
    const filter: any = { conversationId };

    if (participant.clearedAt) {
      filter.createdAt = { $gt: participant.clearedAt };
    }

    if (beforeCursor && beforeCursor.trim()) {
      if (mongoose.Types.ObjectId.isValid(beforeCursor)) {
        filter._id = { $lt: new mongoose.Types.ObjectId(beforeCursor) };
      } else {
        const parsedDate = new Date(beforeCursor);
        if (!isNaN(parsedDate.getTime())) {
          filter.createdAt = participant.clearedAt
            ? { $gt: participant.clearedAt, $lt: parsedDate }
            : { $lt: parsedDate };
        }
      }
    }

    const docs = await MessageModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = docs.length > limit;
    if (hasMore) {
      docs.pop();
    }

    const formattedMessages = (await Promise.all(docs.map(m => this.formatMessageWithPopulate(m)))).reverse();
    const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1]._id.toString() : null;

    return {
      messages: formattedMessages,
      nextCursor,
      hasMore,
    };
  },

  async markMessageDelivered(messageId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new Error('Invalid message ID.');
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      throw new Error('Message not found.');
    }

    const conversation = await ConversationModel.findById(message.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const isParticipant = conversation.participants.some(
      p => p.userId && p.userId.toString() === userId
    );
    if (!isParticipant) {
      throw new Error('Unauthorized to mark message as delivered.');
    }

    if (message.status === 'sent' && message.senderId.toString() !== userId) {
      message.status = 'delivered';
      await message.save();
    }

    return await this.formatMessageWithPopulate(message);
  },

  async markMessagesRead(conversationId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new Error('Invalid conversation ID.');
    }

    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const isParticipant = conversation.participants.some(
      p => p.userId && p.userId.toString() === userId
    );
    if (!isParticipant) {
      throw new Error('Unauthorized to mark messages as read.');
    }

    await MessageModel.updateMany(
      {
        conversationId,
        senderId: { $ne: new mongoose.Types.ObjectId(userId) },
        status: { $ne: 'read' },
      },
      { $set: { status: 'read' } }
    );

    let updated = false;
    for (const p of conversation.participants) {
      if (p.userId && p.userId.toString() === userId) {
        p.unreadCount = 0;
        updated = true;
      }
    }
    if (updated) {
      await conversation.save();
    }

    return {
      conversationId,
      readByUserId: userId,
      readAt: new Date().toISOString(),
    };
  },

  async clearConversationMessages(conversationId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid conversation or user ID.');
    }

    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const participant = conversation.participants.find(
      p => p.userId && p.userId.toString() === userId
    );
    if (!participant) {
      const err: any = new Error('Unauthorized to clear chat in this conversation.');
      err.status = 403;
      throw err;
    }

    const now = new Date();
    participant.clearedAt = now;
    participant.unreadCount = 0;

    await conversation.save();

    return {
      conversationId,
      clearedByUserId: userId,
      clearedAt: now.toISOString(),
    };
  },

  async formatMessageWithPopulate(doc: IMessageDocument) {
    const obj = doc.toObject ? doc.toObject() : doc;

    let replyToMessage: any = null;
    if (obj.replyTo || obj.replyToMessageId) {
      const origId = obj.replyTo || obj.replyToMessageId;
      const origDoc = await MessageModel.findById(origId);
      if (origDoc) {
        const senderUser = await UserModel.findById(origDoc.senderId).select('name username');
        replyToMessage = {
          id: origDoc._id.toString(),
          senderName: senderUser ? senderUser.name : 'User',
          content: origDoc.isDeleted ? 'This message was deleted' : origDoc.content || '',
        };
      }
    }

    const safeReactions = (obj.reactions || []).map((r: any) => ({
      userId: r.userId ? r.userId.toString() : '',
      emoji: r.emoji,
      createdAt: r.createdAt,
    }));

    let formattedAttachments: any[] = [];
    if (Array.isArray(obj.attachments) && obj.attachments.length > 0) {
      const attDocs = await AttachmentModel.find({ _id: { $in: obj.attachments } });
      formattedAttachments = attDocs.map(att => ({
        id: att._id.toString(),
        attachmentId: att._id.toString(),
        originalName: att.originalName,
        storedFileName: att.storedFileName,
        mimeType: att.mimeType,
        size: att.fileSize || att.size,
        fileSize: att.fileSize || att.size,
        checksum: att.checksum || null,
        fileUrl: att.fileUrl,
        thumbnailUrl: att.thumbnailUrl || null,
        durationSeconds: att.durationSeconds || 0,
        createdAt: att.createdAt,
      }));
    }

    return {
      id: obj._id.toString(),
      conversationId: obj.conversationId.toString(),
      senderId: obj.senderId.toString(),
      messageType: obj.messageType,
      content: obj.isDeleted ? 'This message was deleted' : obj.content || '',
      status: obj.status,
      isEdited: !!obj.isEdited,
      editedAt: obj.editedAt || null,
      isDeleted: !!obj.isDeleted,
      deletedAt: obj.deletedAt || null,
      replyToMessageId: obj.replyToMessageId ? obj.replyToMessageId.toString() : null,
      replyToMessage,
      reactions: safeReactions,
      attachments: formattedAttachments,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  },
};
