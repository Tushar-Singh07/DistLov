import mongoose, { Schema, Document } from 'mongoose';

export interface IConversationParticipant {
  userId: mongoose.Types.ObjectId;
  joinedAt: Date;
  role: 'admin' | 'member';
  unreadCount: number;
  clearedAt?: Date | null;
}

export interface IConversationDocument extends Document {
  type: 'direct' | 'group';
  participants: IConversationParticipant[];
  lastMessage?: mongoose.Types.ObjectId;
  lastMessageAt?: Date;
  groupId?: mongoose.Types.ObjectId;
  isMuted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversationDocument>(
  {
    type: {
      type: String,
      enum: ['direct', 'group'],
      required: [true, 'Conversation type is required'],
    },
    participants: {
      type: [
        {
          userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          joinedAt: { type: Date, default: Date.now },
          role: { type: String, enum: ['admin', 'member'], default: 'member' },
          unreadCount: { type: Number, default: 0, min: 0 },
          clearedAt: { type: Date, default: null },
        },
      ],
      validate: [
        (val: IConversationParticipant[]) => val.length >= 2,
        'Conversation must have at least 2 participants',
      ],
    },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    lastMessageAt: { type: Date, default: null },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
    isMuted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for fast recency sorting and participant filtering
ConversationSchema.index({ 'participants.userId': 1, updatedAt: -1 });
ConversationSchema.index({ type: 1, 'participants.userId': 1 });

export const ConversationModel = mongoose.model<IConversationDocument>('Conversation', ConversationSchema);
