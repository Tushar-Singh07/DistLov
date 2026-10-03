# SecureConnect — Database Schema & Collections Reference

## 1. `users` Collection

```typescript
interface IUser {
  _id: ObjectId;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  profilePhoto?: string;
  bio?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  privacySettings: {
    lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
    profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
  };
  blockedUsers: ObjectId[]; // References to User IDs
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 2. `conversations` Collection

```typescript
interface IConversation {
  _id: ObjectId;
  type: 'direct' | 'group';
  participants: Array<{
    userId: ObjectId;
    joinedAt: Date;
    role: 'admin' | 'member';
    unreadCount: number;
  }>;
  lastMessage?: ObjectId; // Reference to Message ID
  groupId?: ObjectId;     // Reference to Group ID if type === 'group'
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. `messages` Collection (E2EE Future-Proofed)

```typescript
interface IMessage {
  _id: ObjectId;
  conversationId: ObjectId;
  senderId: ObjectId;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'system';
  content?: string;          // Plaintext (Phases 1-7)
  ciphertext?: string;       // Encrypted string (Phase 8 E2EE)
  iv?: string;               // Initialization Vector for AES/ChaCha20
  keyVersion?: number;       // Rotated key version tag
  isEncrypted: boolean;      // True if E2EE payload
  attachments: ObjectId[];   // References to Attachment IDs
  replyToMessageId?: ObjectId;// Parent message reference for threaded replies
  reactions: Array<{
    userId: ObjectId;
    emoji: string;
    createdAt: Date;
  }>;
  status: 'sent' | 'delivered' | 'read';
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 4. `attachments` Collection

```typescript
interface IAttachment {
  _id: ObjectId;
  uploaderId: ObjectId;
  conversationId: ObjectId;
  originalName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number; // For audio/video files
  createdAt: Date;
}
```

---

## 5. `calls` Collection

```typescript
interface ICall {
  _id: ObjectId;
  callerId: ObjectId;
  receiverId: ObjectId;
  conversationId?: ObjectId;
  callType: 'audio' | 'video';
  status: 'initiated' | 'accepted' | 'rejected' | 'missed' | 'ended';
  startedAt?: Date;
  endedAt?: Date;
  durationSeconds: number;
  endReason?: 'normal' | 'declined' | 'busy' | 'timeout' | 'connection_error';
  createdAt: Date;
}
```

---

## 6. `sessions` Collection

```typescript
interface ISession {
  _id: ObjectId;
  userId: ObjectId;
  refreshTokenHash: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastActive: Date;
  isValid: boolean;
  createdAt: Date;
}
```

---

## 7. `notifications` Collection

```typescript
interface INotification {
  _id: ObjectId;
  recipientId: ObjectId;
  senderId?: ObjectId;
  type: 'new_message' | 'missed_call' | 'group_invite' | 'system';
  title: string;
  body: string;
  data?: {
    conversationId?: ObjectId;
    callId?: ObjectId;
  };
  isRead: boolean;
  createdAt: Date;
}
```

---

## 8. `groups` Collection

```typescript
interface IGroup {
  _id: ObjectId;
  name: string;
  description?: string;
  avatarUrl?: string;
  ownerId: ObjectId;
  admins: ObjectId[];
  conversationId: ObjectId;
  permissions: {
    onlyAdminsSendMessages: boolean;
    onlyAdminsEditGroupInfo: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```
