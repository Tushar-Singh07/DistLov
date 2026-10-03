import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cookie from 'cookie';
import cookieParser from 'cookie-parser';
import { env } from '../config/env.js';
import { corsOptions } from '../config/cors.js';
import { verifyAccessToken } from '../utils/token.js';
import { findValidSession } from '../services/sessionService.js';
import { UserModel } from '../models/UserModel.js';
import { conversationService } from '../services/conversationService.js';
import { messageService } from '../services/messageService.js';
import { callService } from '../services/callService.js';
import { CallModel } from '../models/CallModel.js';
import { AuthenticatedSocket, ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from './types.js';

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

// Track active socket connections per user for reliable multi-tab presence
const userSocketMap = new Map<string, Set<string>>();

export const initSocketIO = (httpServer: HttpServer) => {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication Middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      let token: string | undefined;

      const reqCookieHeader = socket.request.headers.cookie;
      if (reqCookieHeader) {
        const parsedCookies = cookie.parse(reqCookieHeader);
        if (parsedCookies.access_token) {
          const unsigned = cookieParser.signedCookie(parsedCookies.access_token, env.COOKIE_SECRET);
          token = unsigned !== false ? unsigned : parsedCookies.access_token;
        }
      }

      if (!token && socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token;
      } else if (!token && socket.handshake.headers.authorization?.startsWith('Bearer ')) {
        token = socket.handshake.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return next(new Error('Authentication failed: Token missing'));
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        return next(new Error('Authentication failed: Invalid or expired token'));
      }

      const session = await findValidSession(payload.sessionId);
      if (!session) {
        return next(new Error('Authentication failed: Session expired or revoked'));
      }

      const user = await UserModel.findById(payload.userId);
      if (!user || !user.isActive || user.isBlocked) {
        return next(new Error('Authentication failed: User account inactive'));
      }

      socket.data.userId = user._id.toString();
      socket.data.sessionId = session._id.toString();
      socket.data.user = user;

      next();
    } catch (err: any) {
      next(new Error(`Authentication error: ${err.message}`));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId;
    console.log(`[Socket.IO] Authenticated client connected: user:${userId} (Socket ID: ${socket.id})`);

    // Join personal room
    socket.join(`user:${userId}`);

    // Manage user presence across multi-tab connections
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    const userSockets = userSocketMap.get(userId)!;
    const wasOffline = userSockets.size === 0;
    userSockets.add(socket.id);

    if (wasOffline) {
      const userDoc = await UserModel.findByIdAndUpdate(userId, { isOnline: true }, { new: true });
      const showStatus = userDoc?.privacySettings?.showOnlineStatus !== false;
      io?.emit('presence:update', {
        userId,
        isOnline: showStatus ? true : false,
        lastSeen: null,
      });
    }

    // Join Conversation
    socket.on('conversation:join', async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        await conversationService.getConversationById(conversationId, userId);
        socket.join(`conversation:${conversationId}`);
        socket.emit('conversation:joined', { conversationId });
      } catch (err: any) {
        socket.emit('chat:error', { message: err.message || 'Failed to join conversation' });
      }
    });

    // Leave Conversation
    socket.on('conversation:leave', ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
      socket.emit('conversation:left', { conversationId });
    });

    // Send Message
    socket.on('message:send', async ({ conversationId, content, replyToMessageId, attachmentIds, attachments, messageType }) => {
      try {
        const ids = attachmentIds || attachments || [];
        const message = await messageService.createMessage(
          conversationId,
          userId,
          content || '',
          replyToMessageId,
          ids,
          messageType as any
        );
        
        const conv = await conversationService.getConversationById(conversationId, userId);
        const recipient = conv.participants.find((p: any) => p.id !== userId);

        io?.to(`conversation:${conversationId}`).emit('message:new', message);
        if (recipient?.id) {
          io?.to(`user:${recipient.id}`).emit('message:new', message);
        }
      } catch (err: any) {
        socket.emit('chat:error', { message: err.message || 'Failed to send message' });
      }
    });

    // Send Attachment Message
    socket.on('attachment:send', async ({ conversationId, content, replyToMessageId, attachmentIds, attachments, messageType }) => {
      try {
        const ids = attachmentIds || attachments || [];
        const message = await messageService.createMessage(
          conversationId,
          userId,
          content || '',
          replyToMessageId,
          ids,
          messageType as any
        );

        const conv = await conversationService.getConversationById(conversationId, userId);
        const recipient = conv.participants.find((p: any) => p.id !== userId);

        io?.to(`conversation:${conversationId}`).emit('message:new', message);
        if (recipient?.id) {
          io?.to(`user:${recipient.id}`).emit('message:new', message);
        }
      } catch (err: any) {
        socket.emit('chat:error', { message: err.message || 'Failed to send attachment message' });
      }
    });

    // Edit Message
    socket.on('message:edit', async ({ messageId, content }) => {
      try {
        const updatedMessage = await messageService.editMessage(messageId, userId, content);
        io?.to(`conversation:${updatedMessage.conversationId}`).emit('message:updated', updatedMessage);
      } catch (err: any) {
        socket.emit('chat:error', { message: err.message || 'Failed to edit message' });
      }
    });

    // Delete Message
    socket.on('message:delete', async ({ messageId }) => {
      try {
        const deletedMessage = await messageService.deleteMessage(messageId, userId);
        io?.to(`conversation:${deletedMessage.conversationId}`).emit('message:deleted', deletedMessage);
      } catch (err: any) {
        socket.emit('chat:error', { message: err.message || 'Failed to delete message' });
      }
    });

    // Add Reaction
    socket.on('message:react', async ({ messageId, emoji }) => {
      try {
        const updatedMessage = await messageService.addReaction(messageId, userId, emoji);
        io?.to(`conversation:${updatedMessage.conversationId}`).emit('message:reactionUpdated', updatedMessage);
      } catch (err: any) {
        socket.emit('chat:error', { message: err.message || 'Failed to add reaction' });
      }
    });

    // Remove Reaction
    socket.on('message:unreact', async ({ messageId, emoji }) => {
      try {
        const updatedMessage = await messageService.removeReaction(messageId, userId, emoji);
        io?.to(`conversation:${updatedMessage.conversationId}`).emit('message:reactionUpdated', updatedMessage);
      } catch (err: any) {
        socket.emit('chat:error', { message: err.message || 'Failed to remove reaction' });
      }
    });

    // Typing Indicators
    socket.on('typing:start', async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        await conversationService.getConversationById(conversationId, userId);
        socket.to(`conversation:${conversationId}`).emit('typing:update', {
          conversationId,
          userId,
          isTyping: true,
        });
      } catch (err: any) {
        console.error('[Socket Typing Start Error]:', err.message);
      }
    });

    socket.on('typing:stop', async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        await conversationService.getConversationById(conversationId, userId);
        socket.to(`conversation:${conversationId}`).emit('typing:update', {
          conversationId,
          userId,
          isTyping: false,
        });
      } catch (err: any) {
        console.error('[Socket Typing Stop Error]:', err.message);
      }
    });

    // Mark Message Delivered
    socket.on('message:delivered', async ({ messageId, conversationId }) => {
      try {
        const deliveredMsg = await messageService.markMessageDelivered(messageId, userId);
        io?.to(`conversation:${conversationId}`).emit('message:delivered', {
          messageId: deliveredMsg.id,
          conversationId,
          deliveredAt: new Date().toISOString(),
        });
      } catch (err: any) {
        socket.emit('chat:error', { message: err.message || 'Failed to mark message delivered' });
      }
    });

    // Mark Conversation Messages Read
    socket.on('message:read', async ({ conversationId }) => {
      try {
        const result = await messageService.markMessagesRead(conversationId, userId);
        io?.to(`conversation:${conversationId}`).emit('message:read', {
          conversationId: result.conversationId,
          readByUserId: result.readByUserId,
          readAt: result.readAt,
        });
      } catch (err: any) {
        socket.emit('chat:error', { message: err.message || 'Failed to mark messages read' });
      }
    });

    // Clear Conversation Messages
    socket.on('conversation:clear', async ({ conversationId }) => {
      try {
        const result = await messageService.clearConversationMessages(conversationId, userId);
        io?.to(`user:${userId}`).emit('conversation:cleared', {
          conversationId: result.conversationId,
          clearedByUserId: result.clearedByUserId,
        });
      } catch (err: any) {
        socket.emit('chat:error', { message: err.message || 'Failed to clear chat' });
      }
    });

    // ==========================================
    // WebRTC Call Signaling Handlers
    // ==========================================

    const ringTimeoutMap = new Map<string, NodeJS.Timeout>();

    socket.on('call:initiate', async ({ conversationId, receiverId, callType }) => {
      try {
        const res = await callService.initiateCall({
          callerId: userId,
          receiverId,
          conversationId,
          callType: callType || 'voice',
        });

        if (res.isBusy || !res.call) {
          socket.emit('call:busy', { message: res.message || 'User is currently on another call.' });
          return;
        }

        const callId = res.call._id.toString();

        const timeout = setTimeout(async () => {
          ringTimeoutMap.delete(callId);
          const timedOutCall = await callService.handleRingTimeout(callId);
          if (timedOutCall) {
            io?.to(`user:${userId}`).emit('call:failed', { callId, message: 'Call timed out. No answer.' });
            io?.to(`user:${receiverId}`).emit('call:ended', { callId, reason: 'timeout' });
          }
        }, env.CALL_RING_TIMEOUT_SECONDS * 1000);

        ringTimeoutMap.set(callId, timeout);

        socket.emit('call:initiated', {
          callId,
          conversationId,
        });

        const payload = {
          callId,
          conversationId,
          caller: res.callerInfo,
          callType: callType || 'voice',
        };

        io?.to(`user:${receiverId}`).emit('call:incoming', payload);
        if (conversationId) {
          socket.to(`conversation:${conversationId}`).emit('call:incoming', payload);
        }
      } catch (err: any) {
        socket.emit('call:failed', { message: err.message || 'Failed to initiate call.' });
      }
    });

    socket.on('call:accept', async ({ callId }) => {
      try {
        const call = await callService.acceptCall(callId, userId);
        if (ringTimeoutMap.has(callId)) {
          clearTimeout(ringTimeoutMap.get(callId)!);
          ringTimeoutMap.delete(callId);
        }

        const callerId = call.callerId.toString();
        io?.to(`user:${callerId}`).emit('call:accepted', { callId });
        socket.emit('call:accepted', { callId });
      } catch (err: any) {
        socket.emit('call:failed', { callId, message: err.message || 'Failed to accept call.' });
      }
    });

    socket.on('call:reject', async ({ callId, reason }) => {
      try {
        const call = await callService.rejectCall(callId, userId, reason);
        if (ringTimeoutMap.has(callId)) {
          clearTimeout(ringTimeoutMap.get(callId)!);
          ringTimeoutMap.delete(callId);
        }

        const callerId = call.callerId.toString();
        const receiverId = call.receiverId.toString();
        const peerId = callerId === userId ? receiverId : callerId;

        io?.to(`user:${peerId}`).emit('call:rejected', { callId, reason: reason || 'declined' });
      } catch (err: any) {
        socket.emit('call:failed', { callId, message: err.message || 'Failed to reject call.' });
      }
    });

    socket.on('call:cancel', async ({ callId }) => {
      try {
        const call = await callService.cancelCall(callId, userId);
        if (ringTimeoutMap.has(callId)) {
          clearTimeout(ringTimeoutMap.get(callId)!);
          ringTimeoutMap.delete(callId);
        }

        const receiverId = call.receiverId.toString();
        io?.to(`user:${receiverId}`).emit('call:cancelled', { callId });
      } catch (err: any) {
        socket.emit('call:failed', { callId, message: err.message || 'Failed to cancel call.' });
      }
    });

    socket.on('call:offer', async ({ callId, sdp }) => {
      try {
        const call = await CallModel.findById(callId);
        if (!call) return;
        const isParticipant = call.callerId.toString() === userId || call.receiverId.toString() === userId;
        if (!isParticipant) return;

        const peerId = call.callerId.toString() === userId ? call.receiverId.toString() : call.callerId.toString();
        io?.to(`user:${peerId}`).emit('call:offer', { callId, sdp });
      } catch (err: any) {
        socket.emit('call:failed', { callId, message: err.message });
      }
    });

    socket.on('call:answer', async ({ callId, sdp }) => {
      try {
        const call = await CallModel.findById(callId);
        if (!call) return;
        const isParticipant = call.callerId.toString() === userId || call.receiverId.toString() === userId;
        if (!isParticipant) return;

        const peerId = call.callerId.toString() === userId ? call.receiverId.toString() : call.callerId.toString();
        io?.to(`user:${peerId}`).emit('call:answer', { callId, sdp });
      } catch (err: any) {
        socket.emit('call:failed', { callId, message: err.message });
      }
    });

    socket.on('call:ice-candidate', async ({ callId, candidate }) => {
      try {
        const call = await CallModel.findById(callId);
        if (!call) return;
        const isParticipant = call.callerId.toString() === userId || call.receiverId.toString() === userId;
        if (!isParticipant) return;

        const peerId = call.callerId.toString() === userId ? call.receiverId.toString() : call.callerId.toString();
        io?.to(`user:${peerId}`).emit('call:ice-candidate', { callId, candidate });
      } catch (err: any) {
        socket.emit('call:failed', { callId, message: err.message });
      }
    });

    socket.on('call:end', async ({ callId, reason }) => {
      try {
        const call = await callService.endCall(callId, userId, reason);
        if (ringTimeoutMap.has(callId)) {
          clearTimeout(ringTimeoutMap.get(callId)!);
          ringTimeoutMap.delete(callId);
        }

        const callerId = call.callerId.toString();
        const receiverId = call.receiverId.toString();
        const peerId = callerId === userId ? receiverId : callerId;

        io?.to(`user:${peerId}`).emit('call:ended', { callId, durationSeconds: call.durationSeconds, reason: reason || 'normal' });
        socket.emit('call:ended', { callId, durationSeconds: call.durationSeconds, reason: reason || 'normal' });
      } catch (err: any) {
        socket.emit('call:failed', { callId, message: err.message || 'Failed to end call.' });
      }
    });

    // Disconnect
    socket.on('disconnect', async (reason) => {
      console.log(`[Socket.IO] Client disconnected: user:${userId} (${reason})`);
      const set = userSocketMap.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          userSocketMap.delete(userId);
          const now = new Date();
          const userDoc = await UserModel.findByIdAndUpdate(
            userId,
            { isOnline: false, lastSeen: now },
            { new: true }
          );
          const showLastSeen = userDoc?.privacySettings?.showLastSeen !== false;
          io?.emit('presence:update', {
            userId,
            isOnline: false,
            lastSeen: showLastSeen ? now.toISOString() : null,
          });
          await callService.handleUserDisconnect(userId);
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }
  return io;
};
