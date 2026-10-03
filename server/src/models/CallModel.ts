import mongoose, { Schema, Document } from 'mongoose';

export type CallType = 'voice' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended' | 'cancelled';

export interface ICallDocument extends Document {
  callerId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  type: CallType;
  callType: CallType;
  status: CallStatus;
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  duration: number;
  durationSeconds: number;
  endReason?: 'normal' | 'declined' | 'busy' | 'timeout' | 'connection_error';
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema = new Schema<ICallDocument>(
  {
    callerId: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'callerId is required'] },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'receiverId is required'] },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', default: null },
    type: {
      type: String,
      enum: { values: ['voice', 'video'], message: 'Invalid call type' },
      default: 'voice',
    },
    callType: { type: String, enum: ['voice', 'video'], default: 'voice' },
    status: {
      type: String,
      enum: {
        values: ['ringing', 'accepted', 'rejected', 'missed', 'ended', 'cancelled'],
        message: 'Invalid call status',
      },
      default: 'ringing',
    },
    startedAt: { type: Date, default: Date.now },
    answeredAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    duration: { type: Number, default: 0 },
    durationSeconds: { type: Number, default: 0 },
    endReason: { type: String, enum: ['normal', 'declined', 'busy', 'timeout', 'connection_error'], default: 'normal' },
  },
  { timestamps: true }
);

CallSchema.pre('save', function (next) {
  if (this.type && !this.callType) this.callType = this.type;
  if (this.callType && !this.type) this.type = this.callType;
  if (this.duration !== undefined && this.durationSeconds === 0) this.durationSeconds = this.duration;
  next();
});

CallSchema.index({ callerId: 1, createdAt: -1 });
CallSchema.index({ receiverId: 1, createdAt: -1 });

export const CallModel = mongoose.model<ICallDocument>('Call', CallSchema);
