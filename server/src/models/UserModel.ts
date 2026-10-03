import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  profilePhoto?: string;
  bio?: string;
  status: 'online' | 'offline' | 'away';
  isOnline: boolean;
  lastSeen: Date;
  emailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  isActive: boolean;
  isBlocked: boolean;
  privacySettings: {
    showOnlineStatus: boolean;
    showLastSeen: boolean;
    allowMessagesFrom: 'everyone' | 'contacts';
    allowCallsFrom: 'everyone' | 'contacts';
    lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
    profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
  };
  blockedUsers: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [70, 'Name cannot exceed 70 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_.]+$/, 'Username can only contain letters, numbers, underscores, and dots'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    profilePhoto: { type: String, default: null },
    bio: {
      type: String,
      default: '',
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'away'],
      default: 'offline',
    },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationExpiresAt: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    privacySettings: {
      showOnlineStatus: { type: Boolean, default: true },
      showLastSeen: { type: Boolean, default: true },
      allowMessagesFrom: { type: String, enum: ['everyone', 'contacts'], default: 'everyone' },
      allowCallsFrom: { type: String, enum: ['everyone', 'contacts'], default: 'everyone' },
      lastSeenVisibility: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      readReceipts: { type: Boolean, default: true },
      profilePhotoVisibility: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
    },
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Compound and text indexes
UserSchema.index({ createdAt: -1 });
UserSchema.index({ name: 'text', username: 'text', email: 'text' });

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
