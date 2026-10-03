import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { Message } from '../types';

let socket: Socket | null = null;

const SOCKET_SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export const socketService = {
  connect(): Socket {
    if (!socket) {
      socket = io(SOCKET_SERVER_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      socket.on('connect', () => {
        console.log('[Socket.IO Frontend] Connected to real-time server. ID:', socket?.id);
      });

      socket.on('disconnect', (reason) => {
        console.log('[Socket.IO Frontend] Disconnected:', reason);
      });

      socket.on('chat:error', (err) => {
        console.warn('[Socket.IO Chat Error]:', err?.message);
      });
    }

    if (!socket.connected) {
      socket.connect();
    }

    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  joinConversation(conversationId: string) {
    if (socket && conversationId) {
      socket.emit('conversation:join', { conversationId });
    }
  },

  leaveConversation(conversationId: string) {
    if (socket && conversationId) {
      socket.emit('conversation:leave', { conversationId });
    }
  },

  sendMessage(conversationId: string, content: string, replyToMessageId?: string, attachmentIds?: string[], messageType?: string) {
    if (socket && conversationId && (content || (attachmentIds && attachmentIds.length > 0))) {
      socket.emit('message:send', { conversationId, content, replyToMessageId, attachmentIds, messageType });
    }
  },

  sendAttachment(conversationId: string, content: string, replyToMessageId?: string, attachmentIds?: string[], messageType?: string) {
    if (socket && conversationId && (content || (attachmentIds && attachmentIds.length > 0))) {
      socket.emit('attachment:send', { conversationId, content, replyToMessageId, attachmentIds, messageType });
    }
  },

  editMessage(messageId: string, content: string) {
    if (socket && messageId && content) {
      socket.emit('message:edit', { messageId, content });
    }
  },

  deleteMessage(messageId: string) {
    if (socket && messageId) {
      socket.emit('message:delete', { messageId });
    }
  },

  addReaction(messageId: string, emoji: string) {
    if (socket && messageId && emoji) {
      socket.emit('message:react', { messageId, emoji });
    }
  },

  removeReaction(messageId: string, emoji: string) {
    if (socket && messageId && emoji) {
      socket.emit('message:unreact', { messageId, emoji });
    }
  },

  startTyping(conversationId: string) {
    if (socket && conversationId) {
      socket.emit('typing:start', { conversationId });
    }
  },

  stopTyping(conversationId: string) {
    if (socket && conversationId) {
      socket.emit('typing:stop', { conversationId });
    }
  },

  markDelivered(messageId: string, conversationId: string) {
    if (socket && messageId && conversationId) {
      socket.emit('message:delivered', { messageId, conversationId });
    }
  },

  markRead(conversationId: string) {
    if (socket && conversationId) {
      socket.emit('message:read', { conversationId });
    }
  },

  onNewMessage(callback: (message: Message) => void) {
    if (!socket) this.connect();
    socket?.on('message:new', callback);
    return () => {
      socket?.off('message:new', callback);
    };
  },

  onMessageUpdated(callback: (message: Message) => void) {
    if (!socket) this.connect();
    socket?.on('message:updated', callback);
    return () => {
      socket?.off('message:updated', callback);
    };
  },

  onMessageDeleted(callback: (message: Message) => void) {
    if (!socket) this.connect();
    socket?.on('message:deleted', callback);
    return () => {
      socket?.off('message:deleted', callback);
    };
  },

  onReactionUpdated(callback: (message: Message) => void) {
    if (!socket) this.connect();
    socket?.on('message:reactionUpdated', callback);
    return () => {
      socket?.off('message:reactionUpdated', callback);
    };
  },

  onTypingUpdate(callback: (data: { conversationId: string; userId: string; isTyping: boolean }) => void) {
    if (!socket) this.connect();
    socket?.on('typing:update', callback);
    return () => {
      socket?.off('typing:update', callback);
    };
  },

  onPresenceUpdate(callback: (data: { userId: string; isOnline: boolean; lastSeen: string | null }) => void) {
    if (!socket) this.connect();
    socket?.on('presence:update', callback);
    return () => {
      socket?.off('presence:update', callback);
    };
  },

  onMessageDelivered(callback: (data: { messageId: string; conversationId: string; deliveredAt: string }) => void) {
    if (!socket) this.connect();
    socket?.on('message:delivered', callback);
    return () => {
      socket?.off('message:delivered', callback);
    };
  },

  onMessageRead(callback: (data: { conversationId: string; readByUserId: string; readAt: string }) => void) {
    if (!socket) this.connect();
    socket?.on('message:read', callback);
    return () => {
      socket?.off('message:read', callback);
    };
  },

  clearChat(conversationId: string) {
    if (socket && conversationId) {
      socket.emit('conversation:clear', { conversationId });
    }
  },

  onConversationCleared(callback: (data: { conversationId: string; clearedByUserId: string }) => void) {
    if (!socket) this.connect();
    socket?.on('conversation:cleared', callback);
    return () => {
      socket?.off('conversation:cleared', callback);
    };
  },

  onChatError(callback: (error: { message: string }) => void) {
    if (!socket) this.connect();
    socket?.on('chat:error', callback);
    return () => {
      socket?.off('chat:error', callback);
    };
  },

  // ==========================================
  // WebRTC Call Signaling Methods
  // ==========================================

  initiateCall(conversationId: string, receiverId: string, callType: 'voice' | 'video' = 'voice') {
    if (!socket) this.connect();
    socket?.emit('call:initiate', { conversationId, receiverId, callType });
  },

  acceptCall(callId: string) {
    if (socket && callId) {
      socket.emit('call:accept', { callId });
    }
  },

  rejectCall(callId: string, reason?: string) {
    if (socket && callId) {
      socket.emit('call:reject', { callId, reason });
    }
  },

  cancelCall(callId: string) {
    if (socket && callId) {
      socket.emit('call:cancel', { callId });
    }
  },

  sendCallOffer(callId: string, sdp: any) {
    if (socket && callId && sdp) {
      socket.emit('call:offer', { callId, sdp });
    }
  },

  sendCallAnswer(callId: string, sdp: any) {
    if (socket && callId && sdp) {
      socket.emit('call:answer', { callId, sdp });
    }
  },

  sendIceCandidate(callId: string, candidate: any) {
    if (socket && callId && candidate) {
      socket.emit('call:ice-candidate', { callId, candidate });
    }
  },

  endCall(callId: string, reason?: string) {
    if (socket && callId) {
      socket.emit('call:end', { callId, reason });
    }
  },

  onCallInitiated(callback: (data: { callId: string; conversationId: string }) => void) {
    if (!socket) this.connect();
    socket?.on('call:initiated', callback);
    return () => {
      socket?.off('call:initiated', callback);
    };
  },

  onIncomingCall(callback: (data: { callId: string; conversationId: string; caller: any; callType: 'voice' | 'video' }) => void) {
    if (!socket) this.connect();
    socket?.on('call:incoming', callback);
    return () => {
      socket?.off('call:incoming', callback);
    };
  },

  onCallAccepted(callback: (data: { callId: string }) => void) {
    if (!socket) this.connect();
    socket?.on('call:accepted', callback);
    return () => {
      socket?.off('call:accepted', callback);
    };
  },

  onCallRejected(callback: (data: { callId: string; reason?: string }) => void) {
    if (!socket) this.connect();
    socket?.on('call:rejected', callback);
    return () => {
      socket?.off('call:rejected', callback);
    };
  },

  onCallCancelled(callback: (data: { callId: string }) => void) {
    if (!socket) this.connect();
    socket?.on('call:cancelled', callback);
    return () => {
      socket?.off('call:cancelled', callback);
    };
  },

  onCallOffer(callback: (data: { callId: string; sdp: any }) => void) {
    if (!socket) this.connect();
    socket?.on('call:offer', callback);
    return () => {
      socket?.off('call:offer', callback);
    };
  },

  onCallAnswer(callback: (data: { callId: string; sdp: any }) => void) {
    if (!socket) this.connect();
    socket?.on('call:answer', callback);
    return () => {
      socket?.off('call:answer', callback);
    };
  },

  onIceCandidate(callback: (data: { callId: string; candidate: any }) => void) {
    if (!socket) this.connect();
    socket?.on('call:ice-candidate', callback);
    return () => {
      socket?.off('call:ice-candidate', callback);
    };
  },

  onCallEnded(callback: (data: { callId: string; durationSeconds?: number; reason?: string }) => void) {
    if (!socket) this.connect();
    socket?.on('call:ended', callback);
    return () => {
      socket?.off('call:ended', callback);
    };
  },

  onCallBusy(callback: (data: { callId?: string; message: string }) => void) {
    if (!socket) this.connect();
    socket?.on('call:busy', callback);
    return () => {
      socket?.off('call:busy', callback);
    };
  },

  onCallFailed(callback: (data: { callId?: string; message: string }) => void) {
    if (!socket) this.connect();
    socket?.on('call:failed', callback);
    return () => {
      socket?.off('call:failed', callback);
    };
  },

  onChatRequestReceived(callback: (data: any) => void) {
    if (!socket) this.connect();
    socket?.on('chat_request_received', callback);
    return () => {
      socket?.off('chat_request_received', callback);
    };
  },

  onChatRequestAccepted(callback: (data: any) => void) {
    if (!socket) this.connect();
    socket?.on('chat_request_accepted', callback);
    return () => {
      socket?.off('chat_request_accepted', callback);
    };
  },
};
