import mongoose, { Schema, Document } from 'mongoose';

export type ChatRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface IChatRequestDocument extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  status: ChatRequestStatus;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatRequestSchema = new Schema<IChatRequestDocument>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled'],
      default: 'pending',
    },
    message: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true }
);

ChatRequestSchema.index({ senderId: 1, receiverId: 1 });
ChatRequestSchema.index({ receiverId: 1, status: 1 });
ChatRequestSchema.index({ senderId: 1, status: 1 });

export const ChatRequestModel = mongoose.model<IChatRequestDocument>('ChatRequest', ChatRequestSchema);
