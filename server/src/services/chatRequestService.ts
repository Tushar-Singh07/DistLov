import mongoose from 'mongoose';
import { ChatRequestModel, IChatRequestDocument } from '../models/ChatRequestModel.js';
import { UserModel } from '../models/UserModel.js';
import { ConversationModel } from '../models/ConversationModel.js';
import { NotificationModel } from '../models/NotificationModel.js';
import { conversationService } from './conversationService.js';
import { canUsersInteract } from '../utils/userPrivacy.js';
import { serializePublicUser } from '../utils/userSerializer.js';
import { getIO } from '../sockets/socketManager.js';
import { CustomError } from '../middleware/errorMiddleware.js';

export const chatRequestService = {
  async sendChatRequest(senderId: string, receiverId: string, message?: string) {
    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      const err: CustomError = new Error('Invalid user ID.');
      err.statusCode = 400;
      throw err;
    }

    if (senderId === receiverId) {
      const err: CustomError = new Error('You cannot send a chat request to yourself.');
      err.statusCode = 400;
      throw err;
    }

    const receiver = await UserModel.findById(receiverId);
    if (!receiver || !receiver.isActive || receiver.isBlocked) {
      const err: CustomError = new Error('User not found or account is inactive.');
      err.statusCode = 404;
      throw err;
    }

    const canInteract = await canUsersInteract(senderId, receiverId);
    if (!canInteract) {
      const err: CustomError = new Error('Cannot send chat request due to privacy settings or block list.');
      err.statusCode = 403;
      throw err;
    }

    // Check if direct conversation already exists
    const existingConv = await ConversationModel.findOne({
      type: 'direct',
      'participants.userId': { $all: [senderId, receiverId] },
    });

    if (existingConv) {
      const err: CustomError = new Error('You already have an active conversation with this user.');
      err.statusCode = 400;
      throw err;
    }

    // Check existing pending request from sender to receiver
    const existingPending = await ChatRequestModel.findOne({
      senderId,
      receiverId,
      status: 'pending',
    });

    if (existingPending) {
      const err: CustomError = new Error('A chat request has already been sent to this user.');
      err.statusCode = 400;
      throw err;
    }

    // Check if reverse request exists (receiver already sent request to sender) -> auto accept!
    const reversePending = await ChatRequestModel.findOne({
      senderId: receiverId,
      receiverId: senderId,
      status: 'pending',
    });

    if (reversePending) {
      reversePending.status = 'accepted';
      await reversePending.save();

      const conversation = await conversationService.getOrCreateDirectConversation(senderId, receiverId);

      const formatted = await this.formatRequest(reversePending);
      
      try {
        const io = getIO();
        io.to(`user:${senderId}`).emit('chat:error' as any, { message: 'Chat request auto-accepted! Conversation started.' });
        io.to(`user:${receiverId}`).emit('chat:error' as any, { message: 'Chat request accepted!' });
      } catch (e) {
        // Socket may not be initialized in test mode
      }

      return { request: formatted, conversation, autoAccepted: true };
    }

    // Create new ChatRequest
    const request = await ChatRequestModel.create({
      senderId,
      receiverId,
      message: message?.trim() || '',
      status: 'pending',
    });

    const sender = await UserModel.findById(senderId);

    // Create in-app notification for receiver
    await NotificationModel.create({
      recipientId: receiverId,
      senderId: senderId,
      type: 'system',
      title: 'New Chat Request',
      body: `${sender?.name || 'Someone'} (@${sender?.username || ''}) sent you a request to chat.`,
      message: `${sender?.name || 'Someone'} sent you a request to chat.`,
    });

    const formatted = await this.formatRequest(request);

    // Socket notification to receiver
    try {
      const io = getIO();
      io.to(`user:${receiverId}`).emit('chat:error' as any, { message: `New chat request from ${sender?.name}` });
      io.to(`user:${receiverId}`).emit('chat_request_received' as any, formatted);
    } catch (e) {
      // Ignore socket error if IO not initialized
    }

    return { request: formatted };
  },

  async getPendingRequests(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const err: CustomError = new Error('Invalid user ID.');
      err.statusCode = 400;
      throw err;
    }

    const [incomingDocs, outgoingDocs] = await Promise.all([
      ChatRequestModel.find({ receiverId: userId, status: 'pending' })
        .populate('senderId', 'name username profilePhoto bio status isOnline lastSeen privacySettings')
        .sort({ createdAt: -1 }),
      ChatRequestModel.find({ senderId: userId, status: 'pending' })
        .populate('receiverId', 'name username profilePhoto bio status isOnline lastSeen privacySettings')
        .sort({ createdAt: -1 }),
    ]);

    const incoming = incomingDocs.map(doc => ({
      id: doc._id.toString(),
      senderId: doc.senderId ? (doc.senderId as any)._id.toString() : '',
      receiverId: userId,
      sender: doc.senderId ? serializePublicUser(doc.senderId as any) : undefined,
      message: doc.message || '',
      status: doc.status,
      createdAt: doc.createdAt,
    }));

    const outgoing = outgoingDocs.map(doc => ({
      id: doc._id.toString(),
      senderId: userId,
      receiverId: doc.receiverId ? (doc.receiverId as any)._id.toString() : '',
      receiver: doc.receiverId ? serializePublicUser(doc.receiverId as any) : undefined,
      message: doc.message || '',
      status: doc.status,
      createdAt: doc.createdAt,
    }));

    return { incoming, outgoing };
  },

  async acceptChatRequest(requestId: string, currentUserId: string) {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      const err: CustomError = new Error('Invalid request ID.');
      err.statusCode = 400;
      throw err;
    }

    const request = await ChatRequestModel.findById(requestId);
    if (!request) {
      const err: CustomError = new Error('Chat request not found.');
      err.statusCode = 404;
      throw err;
    }

    if (request.receiverId.toString() !== currentUserId) {
      const err: CustomError = new Error('Unauthorized to accept this request.');
      err.statusCode = 403;
      throw err;
    }

    if (request.status !== 'pending') {
      const err: CustomError = new Error(`Request is already ${request.status}.`);
      err.statusCode = 400;
      throw err;
    }

    request.status = 'accepted';
    await request.save();

    // Create Direct Conversation
    const conversation = await conversationService.getOrCreateDirectConversation(
      request.senderId.toString(),
      request.receiverId.toString()
    );

    const receiverUser = await UserModel.findById(currentUserId);

    // Create notification for sender
    await NotificationModel.create({
      recipientId: request.senderId,
      senderId: currentUserId,
      type: 'system',
      title: 'Chat Request Accepted',
      body: `${receiverUser?.name || 'User'} accepted your chat request!`,
      message: `${receiverUser?.name || 'User'} accepted your chat request!`,
    });

    const formattedRequest = await this.formatRequest(request);

    // Emit socket events to both sender and receiver
    try {
      const io = getIO();
      io.to(`user:${request.senderId.toString()}`).emit('chat_request_accepted' as any, {
        request: formattedRequest,
        conversation,
      });
      io.to(`user:${currentUserId}`).emit('chat_request_accepted' as any, {
        request: formattedRequest,
        conversation,
      });
    } catch (e) {
      // Ignore
    }

    return { request: formattedRequest, conversation };
  },

  async declineChatRequest(requestId: string, currentUserId: string) {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      const err: CustomError = new Error('Invalid request ID.');
      err.statusCode = 400;
      throw err;
    }

    const request = await ChatRequestModel.findById(requestId);
    if (!request) {
      const err: CustomError = new Error('Chat request not found.');
      err.statusCode = 404;
      throw err;
    }

    if (request.receiverId.toString() !== currentUserId) {
      const err: CustomError = new Error('Unauthorized to decline this request.');
      err.statusCode = 403;
      throw err;
    }

    request.status = 'declined';
    await request.save();

    return { request: await this.formatRequest(request) };
  },

  async cancelChatRequest(requestId: string, currentUserId: string) {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      const err: CustomError = new Error('Invalid request ID.');
      err.statusCode = 400;
      throw err;
    }

    const request = await ChatRequestModel.findById(requestId);
    if (!request) {
      const err: CustomError = new Error('Chat request not found.');
      err.statusCode = 404;
      throw err;
    }

    if (request.senderId.toString() !== currentUserId) {
      const err: CustomError = new Error('Unauthorized to cancel this request.');
      err.statusCode = 403;
      throw err;
    }

    request.status = 'cancelled';
    await request.save();

    return { request: await this.formatRequest(request) };
  },

  async getChatStatusWithUser(currentUserId: string, targetUserId: string) {
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      const err: CustomError = new Error('Invalid target user ID.');
      err.statusCode = 400;
      throw err;
    }

    // Check direct conversation
    const conversation = await ConversationModel.findOne({
      type: 'direct',
      'participants.userId': { $all: [currentUserId, targetUserId] },
    });

    if (conversation) {
      return {
        status: 'accepted',
        conversationId: conversation._id.toString(),
        requestId: null,
      };
    }

    // Check latest request
    const request = await ChatRequestModel.findOne({
      $or: [
        { senderId: currentUserId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: currentUserId },
      ],
    }).sort({ createdAt: -1 });

    if (!request || request.status === 'cancelled' || request.status === 'declined') {
      return { status: 'none', conversationId: null, requestId: null };
    }

    if (request.status === 'pending') {
      if (request.senderId.toString() === currentUserId) {
        return { status: 'pending_sent', conversationId: null, requestId: request._id.toString() };
      } else {
        return { status: 'pending_received', conversationId: null, requestId: request._id.toString() };
      }
    }

    return { status: request.status, conversationId: null, requestId: request._id.toString() };
  },

  async formatRequest(request: IChatRequestDocument) {
    const sender = await UserModel.findById(request.senderId).select('name username profilePhoto bio status isOnline lastSeen privacySettings');
    const receiver = await UserModel.findById(request.receiverId).select('name username profilePhoto bio status isOnline lastSeen privacySettings');

    return {
      id: request._id.toString(),
      senderId: request.senderId.toString(),
      receiverId: request.receiverId.toString(),
      sender: sender ? serializePublicUser(sender) : undefined,
      receiver: receiver ? serializePublicUser(receiver) : undefined,
      message: request.message || '',
      status: request.status,
      createdAt: request.createdAt,
    };
  },
};
