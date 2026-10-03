import mongoose from 'mongoose';
import { ConversationModel, IConversationDocument } from '../models/ConversationModel.js';
import { UserModel } from '../models/UserModel.js';
import { canUsersInteract } from '../utils/userPrivacy.js';
import { serializePublicUser } from '../utils/userSerializer.js';

const extractUserId = (p: any): string => {
  if (!p || !p.userId) return '';
  return p.userId._id ? p.userId._id.toString() : p.userId.toString();
};

export const conversationService = {
  async getOrCreateDirectConversation(userAId: string, userBId: string) {
    if (!mongoose.Types.ObjectId.isValid(userAId) || !mongoose.Types.ObjectId.isValid(userBId)) {
      throw new Error('Invalid user ID provided.');
    }

    if (userAId === userBId) {
      throw new Error('Self-conversations are not supported.');
    }

    const targetUser = await UserModel.findById(userBId);
    if (!targetUser || !targetUser.isActive || targetUser.isBlocked) {
      throw new Error('Target user does not exist or account is inactive.');
    }

    const canInteract = await canUsersInteract(userAId, userBId);
    if (!canInteract) {
      throw new Error('Cannot start conversation due to blocking settings.');
    }

    // Check for existing direct conversation
    let conversation = await ConversationModel.findOne({
      type: 'direct',
      'participants.userId': { $all: [userAId, userBId] },
    })
      .populate('participants.userId', 'name username profilePhoto bio isOnline lastSeen privacySettings')
      .populate('lastMessage');

    if (conversation) {
      return this.formatConversationForUser(conversation, userAId);
    }

    // Create new direct conversation
    const newConv = await ConversationModel.create({
      type: 'direct',
      participants: [
        { userId: userAId, role: 'admin', unreadCount: 0 },
        { userId: userBId, role: 'member', unreadCount: 0 },
      ],
    });

    const populated = await ConversationModel.findById(newConv._id)
      .populate('participants.userId', 'name username profilePhoto bio isOnline lastSeen privacySettings')
      .populate('lastMessage');

    return this.formatConversationForUser(populated!, userAId);
  },

  async getUserConversations(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID.');
    }

    const conversations = await ConversationModel.find({
      'participants.userId': userId,
    })
      .sort({ updatedAt: -1 })
      .populate('participants.userId', 'name username profilePhoto bio isOnline lastSeen privacySettings')
      .populate('lastMessage');

    return conversations.map(conv => this.formatConversationForUser(conv, userId));
  },

  async getConversationById(conversationId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new Error('Invalid conversation ID.');
    }

    const conversation = await ConversationModel.findById(conversationId)
      .populate('participants.userId', 'name username profilePhoto bio isOnline lastSeen privacySettings')
      .populate('lastMessage');

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const isParticipant = conversation.participants.some(
      p => extractUserId(p) === userId
    );

    if (!isParticipant) {
      throw new Error('Unauthorized access to conversation.');
    }

    return this.formatConversationForUser(conversation, userId);
  },

  formatConversationForUser(conv: IConversationDocument, currentUserId: string) {
    const rawObj = conv.toObject ? conv.toObject() : conv;

    const formattedParticipants = (rawObj.participants || []).map((p: any) => {
      const userDoc = p.userId;
      let safeUser: any = null;
      if (userDoc && typeof userDoc === 'object' && userDoc._id) {
        safeUser = serializePublicUser(userDoc);
      } else {
        safeUser = { id: userDoc?.toString() || '' };
      }

      return {
        id: safeUser.id,
        user: safeUser,
        role: p.role,
        unreadCount: extractUserId(p) === currentUserId ? p.unreadCount : 0,
        joinedAt: p.joinedAt,
      };
    });

    const currentParticipant = (rawObj.participants || []).find((p: any) => extractUserId(p) === currentUserId);
    const clearedAtDate = currentParticipant?.clearedAt ? new Date(currentParticipant.clearedAt) : null;

    let safeLastMessage: any = null;
    if (rawObj.lastMessage && typeof rawObj.lastMessage === 'object') {
      const lm = rawObj.lastMessage;
      const msgDate = new Date(lm.createdAt);

      if (!clearedAtDate || msgDate > clearedAtDate) {
        safeLastMessage = {
          id: lm._id.toString(),
          conversationId: lm.conversationId?.toString(),
          senderId: lm.senderId?.toString(),
          content: lm.content,
          messageType: lm.messageType,
          status: lm.status,
          createdAt: lm.createdAt,
        };
      }
    }

    return {
      id: rawObj._id.toString(),
      type: rawObj.type,
      participants: formattedParticipants,
      lastMessage: safeLastMessage,
      lastMessageAt: rawObj.lastMessageAt || rawObj.updatedAt,
      updatedAt: rawObj.updatedAt,
      createdAt: rawObj.createdAt,
    };
  },
};
