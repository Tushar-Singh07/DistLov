import mongoose, { Schema, Document } from 'mongoose';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'file' | 'system' | 'call';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface IReaction {
  userId: mongoose.Types.ObjectId;
  emoji: string;
  createdAt: Date;
}

export interface IMessageDocument extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  messageType: MessageType;
  content?: string;
  // E2EE Future Compatibility Fields
  ciphertext?: string;
  encryptionVersion?: number;
  keyId?: string;
  iv?: string; // Initialization Vector / Nonce
  isEncrypted: boolean;

  attachments: mongoose.Types.ObjectId[];
  replyTo?: mongoose.Types.ObjectId;
  replyToMessageId?: mongoose.Types.ObjectId;
  reactions: IReaction[];
  status: MessageStatus;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'conversationId is required'],
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'senderId is required'],
    },
    messageType: {
      type: String,
      enum: {
        values: ['text', 'image', 'video', 'audio', 'document', 'file', 'system', 'call'],
        message: 'Invalid messageType',
      },
      default: 'text',
    },
    content: { type: String, default: '' },

    // E2EE Architectural Support
    ciphertext: { type: String, default: null },
    encryptionVersion: { type: Number, default: 1 },
    keyId: { type: String, default: null },
    iv: { type: String, default: null },
    isEncrypted: { type: Boolean, default: false },

    attachments: [{ type: Schema.Types.ObjectId, ref: 'Attachment' }],
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    replyToMessageId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },

    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        emoji: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound indexes for history pagination and sender queries
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ content: 'text' });

export const MessageModel = mongoose.model<IMessageDocument>('Message', MessageSchema);
