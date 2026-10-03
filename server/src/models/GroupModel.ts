import mongoose, { Schema, Document } from 'mongoose';

export type GroupRole = 'owner' | 'admin' | 'member';

export interface IGroupMember {
  userId: mongoose.Types.ObjectId;
  role: GroupRole;
  joinedAt: Date;
}

export interface IGroupDocument extends Document {
  name: string;
  description?: string;
  avatar?: string;
  avatarUrl?: string;
  ownerId: mongoose.Types.ObjectId;
  admins: mongoose.Types.ObjectId[];
  members: IGroupMember[];
  conversationId: mongoose.Types.ObjectId;
  permissions: {
    onlyAdminsSendMessages: boolean;
    onlyAdminsEditGroupInfo: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroupDocument>(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    description: { type: String, default: '', maxlength: [500, 'Description cannot exceed 500 characters'] },
    avatar: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    permissions: {
      onlyAdminsSendMessages: { type: Boolean, default: false },
      onlyAdminsEditGroupInfo: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

GroupSchema.pre('save', function (next) {
  if (this.avatar && !this.avatarUrl) this.avatarUrl = this.avatar;
  if (this.avatarUrl && !this.avatar) this.avatar = this.avatarUrl;
  next();
});

GroupSchema.index({ conversationId: 1 }, { unique: true });
GroupSchema.index({ ownerId: 1 });
GroupSchema.index({ 'members.userId': 1 });

export const GroupModel = mongoose.model<IGroupDocument>('Group', GroupSchema);
