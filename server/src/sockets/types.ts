import { Socket } from 'socket.io';
import { IUserDocument } from '../models/UserModel.js';

export interface SocketData {
  userId: string;
  sessionId: string;
  user: IUserDocument;
}

export interface ClientToServerEvents {
  'conversation:join': (payload: { conversationId: string }) => void;
  'conversation:leave': (payload: { conversationId: string }) => void;
  'message:send': (payload: { conversationId: string; content?: string; replyToMessageId?: string; attachmentIds?: string[]; attachments?: string[]; messageType?: string }) => void;
  'attachment:send': (payload: { conversationId: string; content?: string; replyToMessageId?: string; attachmentIds?: string[]; attachments?: string[]; messageType?: string }) => void;
  'message:edit': (payload: { messageId: string; content: string }) => void;
  'message:delete': (payload: { messageId: string }) => void;
  'message:react': (payload: { messageId: string; emoji: string }) => void;
  'message:unreact': (payload: { messageId: string; emoji: string }) => void;
  'message:delivered': (payload: { messageId: string; conversationId: string }) => void;
  'message:read': (payload: { conversationId: string }) => void;
  'typing:start': (payload: { conversationId: string }) => void;
  'typing:stop': (payload: { conversationId: string }) => void;
  'conversation:clear': (payload: { conversationId: string }) => void;

  // WebRTC Call Signaling Events
  'call:initiate': (payload: { conversationId: string; receiverId: string; callType: 'voice' | 'video' }) => void;
  'call:accept': (payload: { callId: string }) => void;
  'call:reject': (payload: { callId: string; reason?: string }) => void;
  'call:cancel': (payload: { callId: string }) => void;
  'call:offer': (payload: { callId: string; sdp: any }) => void;
  'call:answer': (payload: { callId: string; sdp: any }) => void;
  'call:ice-candidate': (payload: { callId: string; candidate: any }) => void;
  'call:end': (payload: { callId: string; reason?: string }) => void;
  'call:busy': (payload: { callId?: string }) => void;
}

export interface ServerToClientEvents {
  'conversation:joined': (payload: { conversationId: string }) => void;
  'conversation:left': (payload: { conversationId: string }) => void;
  'message:new': (message: any) => void;
  'message:updated': (message: any) => void;
  'message:deleted': (message: any) => void;
  'message:reactionUpdated': (message: any) => void;
  'message:delivered': (payload: { messageId: string; conversationId: string; deliveredAt: string }) => void;
  'message:read': (payload: { conversationId: string; readByUserId: string; readAt: string }) => void;
  'typing:update': (payload: { conversationId: string; userId: string; isTyping: boolean }) => void;
  'presence:update': (payload: { userId: string; isOnline: boolean; lastSeen: string | null }) => void;
  'conversation:cleared': (payload: { conversationId: string; clearedByUserId: string }) => void;
  'chat:error': (error: { message: string; code?: string }) => void;

  // WebRTC Call Signaling Server Events
  'call:initiated': (payload: { callId: string; conversationId: string }) => void;
  'call:incoming': (payload: {
    callId: string;
    conversationId: string;
    caller: { id: string; name: string; username: string; profilePhoto?: string | null };
    callType: 'voice' | 'video';
  }) => void;
  'call:accepted': (payload: { callId: string }) => void;
  'call:rejected': (payload: { callId: string; reason?: string }) => void;
  'call:cancelled': (payload: { callId: string }) => void;
  'call:offer': (payload: { callId: string; sdp: any }) => void;
  'call:answer': (payload: { callId: string; sdp: any }) => void;
  'call:ice-candidate': (payload: { callId: string; candidate: any }) => void;
  'call:ended': (payload: { callId: string; durationSeconds?: number; reason?: string }) => void;
  'call:busy': (payload: { callId?: string; message: string }) => void;
  'call:failed': (payload: { callId?: string; message: string }) => void;
}

export interface InterServerEvents {}

export type AuthenticatedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
