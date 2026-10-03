import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 'message' | 'call' | 'group' | 'system' | 'new_message' | 'missed_call' | 'group_invite';

export interface INotificationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  senderId?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  message: string;
  data?: {
    conversationId?: mongoose.Types.ObjectId;
    callId?: mongoose.Types.ObjectId;
  };
  read: boolean;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    type: {
      type: String,
      enum: ['message', 'call', 'group', 'system', 'new_message', 'missed_call', 'group_invite'],
      required: true,
    },
    title: { type: String, required: [true, 'Notification title is required'] },
    body: { type: String, required: true },
    message: { type: String },
    data: {
      conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', default: null },
      callId: { type: Schema.Types.ObjectId, ref: 'Call', default: null },
    },
    read: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.pre('save', function (next) {
  if (!this.userId) this.userId = this.recipientId;
  if (!this.recipientId) this.recipientId = this.userId;
  if (!this.message) this.message = this.body;
  if (!this.body) this.body = this.message;
  this.isRead = this.read;
  next();
});

NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotificationDocument>('Notification', NotificationSchema);
