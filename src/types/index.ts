export type UserStatus = 'online' | 'offline' | 'away';

export interface PrivacySettings {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  allowMessagesFrom?: 'everyone' | 'contacts';
  allowCallsFrom?: 'everyone' | 'contacts';
  lastSeenVisibility?: 'everyone' | 'contacts' | 'nobody';
  readReceipts?: boolean;
  profilePhotoVisibility?: 'everyone' | 'contacts' | 'nobody';
}

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  profilePhoto?: string | null;
  avatarUrl?: string;
  bio?: string;
  status?: UserStatus;
  isOnline?: boolean;
  lastSeen?: string | null;
  isEmailVerified?: boolean;
  privacySettings?: PrivacySettings;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'file' | 'system' | 'call';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface Attachment {
  id: string;
  attachmentId?: string;
  originalName: string;
  storedFileName?: string;
  mimeType: string;
  fileSize: number;
  size?: number;
  checksum?: string | null;
  fileUrl?: string;
  url?: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number;
  createdAt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  messageType: MessageType;
  content?: string;
  attachments?: Attachment[];
  replyToMessageId?: string;
  replyToMessage?: {
    senderName: string;
    content: string;
  };
  reactions?: Reaction[];
  status: MessageStatus;
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  createdAt: string;
}

export type ConversationType = 'direct' | 'group';

export interface Participant {
  id?: string;
  userId: string;
  user?: User;
  role?: 'admin' | 'member';
  unreadCount: number;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participants: Participant[];
  name?: string; // For groups
  avatarUrl?: string; // For groups
  description?: string; // For groups
  ownerId?: string; // For groups
  admins?: string[]; // For groups
  lastMessage?: Message;
  updatedAt: string;
  isMuted?: boolean;
}

export type CallType = 'voice' | 'video';
export type CallState = 'idle' | 'outgoing' | 'incoming' | 'active' | 'ended';

export interface CallSession {
  id: string;
  peerUser: User;
  callType: CallType;
  state: CallState;
  startTime?: string;
  durationSeconds: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'message' | 'call' | 'group' | 'security';
  title: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  sender?: {
    name: string;
    avatarUrl?: string;
  };
}

export interface SessionDevice {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export type ChatRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface ChatRequest {
  id: string;
  senderId: string;
  receiverId: string;
  sender?: User;
  receiver?: User;
  message?: string;
  status: ChatRequestStatus;
  createdAt: string;
}

export interface ChatStatusResult {
  status: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'declined';
  conversationId?: string | null;
  requestId?: string | null;
}

