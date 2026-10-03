import mongoose from 'mongoose';
import { UserModel } from '../models/UserModel.js';

export interface UserRelationship {
  isBlockedByMe: boolean;
  isBlockedByThem: boolean;
  canInteract: boolean;
}

export const isUserBlocked = async (
  blockerId: mongoose.Types.ObjectId | string,
  targetId: mongoose.Types.ObjectId | string
): Promise<boolean> => {
  const user = await UserModel.findById(blockerId).select('blockedUsers');
  if (!user || !user.blockedUsers) return false;
  return user.blockedUsers.some(id => id.toString() === targetId.toString());
};

export const getUserRelationship = async (
  currentUserId: mongoose.Types.ObjectId | string,
  targetUserId: mongoose.Types.ObjectId | string
): Promise<UserRelationship> => {
  const [currentUser, targetUser] = await Promise.all([
    UserModel.findById(currentUserId).select('blockedUsers'),
    UserModel.findById(targetUserId).select('blockedUsers'),
  ]);

  const isBlockedByMe = currentUser?.blockedUsers?.some(id => id.toString() === targetUserId.toString()) || false;
  const isBlockedByThem = targetUser?.blockedUsers?.some(id => id.toString() === currentUserId.toString()) || false;

  return {
    isBlockedByMe,
    isBlockedByThem,
    canInteract: !isBlockedByMe && !isBlockedByThem,
  };
};

export const canUsersInteract = async (
  userAId: mongoose.Types.ObjectId | string,
  userBId: mongoose.Types.ObjectId | string
): Promise<boolean> => {
  const rel = await getUserRelationship(userAId, userBId);
  return rel.canInteract;
};
