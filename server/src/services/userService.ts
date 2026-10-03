import mongoose from 'mongoose';
import { UserModel, IUserDocument } from '../models/UserModel.js';
import { serializeUser, serializePublicUser, SafeUser, PublicUser } from '../utils/userSerializer.js';
import { getUserRelationship, UserRelationship } from '../utils/userPrivacy.js';
import { CustomError } from '../middleware/errorMiddleware.js';

export interface UpdateProfileInput {
  name?: string;
  username?: string;
  bio?: string;
  profilePhoto?: string | null;
}

export interface PrivacySettingsInput {
  showOnlineStatus?: boolean;
  showLastSeen?: boolean;
  allowMessagesFrom?: 'everyone' | 'contacts';
  allowCallsFrom?: 'everyone' | 'contacts';
  lastSeenVisibility?: 'everyone' | 'contacts' | 'nobody';
  readReceipts?: boolean;
  profilePhotoVisibility?: 'everyone' | 'contacts' | 'nobody';
}

export const getMyProfile = async (userId: string): Promise<SafeUser> => {
  const user = await UserModel.findById(userId);
  if (!user) {
    const err: CustomError = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return serializeUser(user);
};

export const updateMyProfile = async (userId: string, input: UpdateProfileInput): Promise<SafeUser> => {
  const user = await UserModel.findById(userId);
  if (!user) {
    const err: CustomError = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  // Explicitly Whitelisted Fields Only
  if (input.name !== undefined) {
    user.name = input.name.trim();
  }

  if (input.bio !== undefined) {
    user.bio = input.bio.trim();
  }

  if (input.profilePhoto !== undefined) {
    user.profilePhoto = input.profilePhoto || undefined;
  }

  if (input.username !== undefined && input.username.toLowerCase().trim() !== user.username) {
    const newUsername = input.username.toLowerCase().trim();

    const existing = await UserModel.findOne({ username: newUsername, _id: { $ne: user._id } });
    if (existing) {
      const err: CustomError = new Error('Username is already taken. Please choose another.');
      err.statusCode = 400;
      throw err;
    }
    user.username = newUsername;
  }

  await user.save();
  return serializeUser(user);
};

export const getPublicProfileByUsername = async (
  username: string,
  viewerId?: string
): Promise<{ user: PublicUser; relationship?: UserRelationship }> => {
  const normalized = username.toLowerCase().trim();
  const user = await UserModel.findOne({ username: normalized, isActive: true });

  if (!user) {
    const err: CustomError = new Error('User profile not found');
    err.statusCode = 404;
    throw err;
  }

  let relationship: UserRelationship | undefined = undefined;
  if (viewerId && viewerId !== user._id.toString()) {
    relationship = await getUserRelationship(viewerId, user._id.toString());
  }

  return {
    user: serializePublicUser(user),
    relationship,
  };
};

export const searchUsers = async (
  query: string,
  currentUserId: string,
  limit: number = 15
): Promise<PublicUser[]> => {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 1) {
    return [];
  }

  const searchRegex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const users = await UserModel.find({
    _id: { $ne: currentUserId },
    isActive: true,
    isBlocked: false,
    $or: [{ name: searchRegex }, { username: searchRegex }],
  })
    .limit(limit)
    .select('name username profilePhoto bio status isOnline lastSeen privacySettings');

  return users.map(u => serializePublicUser(u));
};

export const blockUser = async (currentUserId: string, targetUserId: string): Promise<void> => {
  if (currentUserId === targetUserId) {
    const err: CustomError = new Error('You cannot block yourself.');
    err.statusCode = 400;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    const err: CustomError = new Error('Invalid target user ID.');
    err.statusCode = 400;
    throw err;
  }

  const targetUser = await UserModel.findById(targetUserId);
  if (!targetUser) {
    const err: CustomError = new Error('Target user not found.');
    err.statusCode = 404;
    throw err;
  }

  await UserModel.findByIdAndUpdate(currentUserId, {
    $addToSet: { blockedUsers: new mongoose.Types.ObjectId(targetUserId) },
  });
};

export const unblockUser = async (currentUserId: string, targetUserId: string): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    const err: CustomError = new Error('Invalid target user ID.');
    err.statusCode = 400;
    throw err;
  }

  await UserModel.findByIdAndUpdate(currentUserId, {
    $pull: { blockedUsers: new mongoose.Types.ObjectId(targetUserId) },
  });
};

export const getMyPrivacySettings = async (userId: string) => {
  const user = await UserModel.findById(userId).select('privacySettings');
  if (!user) {
    const err: CustomError = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  const privacy = (user.privacySettings as any) || {};
  return {
    showOnlineStatus: privacy.showOnlineStatus !== false,
    showLastSeen: privacy.showLastSeen !== false,
    allowMessagesFrom: privacy.allowMessagesFrom || 'everyone',
    allowCallsFrom: privacy.allowCallsFrom || 'everyone',
    lastSeenVisibility: privacy.lastSeenVisibility || 'everyone',
    readReceipts: privacy.readReceipts !== false,
    profilePhotoVisibility: privacy.profilePhotoVisibility || 'everyone',
  };
};

export const updateMyPrivacySettings = async (userId: string, input: PrivacySettingsInput) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    const err: CustomError = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const currentPrivacy = (user.privacySettings as any) || {};

  if (input.showOnlineStatus !== undefined) currentPrivacy.showOnlineStatus = input.showOnlineStatus;
  if (input.showLastSeen !== undefined) currentPrivacy.showLastSeen = input.showLastSeen;
  if (input.allowMessagesFrom !== undefined) currentPrivacy.allowMessagesFrom = input.allowMessagesFrom;
  if (input.allowCallsFrom !== undefined) currentPrivacy.allowCallsFrom = input.allowCallsFrom;
  if (input.lastSeenVisibility !== undefined) currentPrivacy.lastSeenVisibility = input.lastSeenVisibility;
  if (input.readReceipts !== undefined) currentPrivacy.readReceipts = input.readReceipts;
  if (input.profilePhotoVisibility !== undefined) currentPrivacy.profilePhotoVisibility = input.profilePhotoVisibility;

  user.privacySettings = currentPrivacy;
  user.markModified('privacySettings');
  await user.save();

  return getMyPrivacySettings(userId);
};
