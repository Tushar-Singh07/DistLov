import mongoose, { Schema, Document } from 'mongoose';

export interface ISessionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId: string;
  refreshTokenHash: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  operatingSystem: string;
  os: string;
  ipAddress: string;
  userAgent?: string;
  lastActiveAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'userId is required'] },
    sessionId: { type: String, required: true, unique: true },
    refreshTokenHash: { type: String, required: true },
    deviceName: { type: String, required: true },
    deviceType: { type: String, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop' },
    browser: { type: String, default: 'Unknown Browser' },
    operatingSystem: { type: String, default: 'Unknown OS' },
    os: { type: String, default: 'Unknown OS' },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, default: '' },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    isValid: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SessionSchema.pre('save', function (next) {
  if (this.operatingSystem && !this.os) this.os = this.operatingSystem;
  if (this.os && !this.operatingSystem) this.operatingSystem = this.os;
  next();
});

SessionSchema.index({ userId: 1 });
SessionSchema.index({ expiresAt: 1 });

export const SessionModel = mongoose.model<ISessionDocument>('Session', SessionSchema);
