import { IUserDocument } from '../models/UserModel.js';

export interface SafeUser {
  id: string;
  name: string;
  username: string;
  email: string;
  profilePhoto?: string | null;
  bio?: string;
  status: string;
  isOnline: boolean;
  lastSeen: Date;
  emailVerified: boolean;
  isActive: boolean;
  privacySettings: {
    showOnlineStatus: boolean;
    showLastSeen: boolean;
    allowMessagesFrom: 'everyone' | 'contacts';
    allowCallsFrom: 'everyone' | 'contacts';
    lastSeenVisibility?: string;
    readReceipts?: boolean;
    profilePhotoVisibility?: string;
  };
  blockedUsers?: string[];
  createdAt: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  username: string;
  profilePhoto: string | null;
  bio: string;
  status?: string;
  isOnline?: boolean;
  lastSeen?: Date | null;
}

export const serializeUser = (user: IUserDocument): SafeUser => {
  const privacy = (user.privacySettings as any) || {};

  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    profilePhoto: user.profilePhoto || null,
    bio: user.bio || '',
    status: user.status || 'offline',
    isOnline: user.isOnline || false,
    lastSeen: user.lastSeen,
    emailVerified: user.emailVerified || (user as any).isEmailVerified || false,
    isActive: user.isActive !== false,
    privacySettings: {
      showOnlineStatus: privacy.showOnlineStatus !== false,
      showLastSeen: privacy.showLastSeen !== false,
      allowMessagesFrom: privacy.allowMessagesFrom || 'everyone',
      allowCallsFrom: privacy.allowCallsFrom || 'everyone',
      lastSeenVisibility: privacy.lastSeenVisibility || 'everyone',
      readReceipts: privacy.readReceipts !== false,
      profilePhotoVisibility: privacy.profilePhotoVisibility || 'everyone',
    },
    blockedUsers: (user.blockedUsers || []).map(id => id.toString()),
    createdAt: user.createdAt,
  };
};

export const serializePublicUser = (user: IUserDocument): PublicUser => {
  const privacy = (user.privacySettings as any) || {};
  const showOnline = privacy.showOnlineStatus !== false && privacy.lastSeenVisibility !== 'nobody';
  const showLastSeen = privacy.showLastSeen !== false && privacy.lastSeenVisibility !== 'nobody';
  const showPhoto = privacy.profilePhotoVisibility !== 'nobody';

  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    profilePhoto: showPhoto ? (user.profilePhoto || null) : null,
    bio: user.bio || '',
    ...(showOnline && { status: user.status || 'offline', isOnline: user.isOnline || false }),
    ...(showLastSeen && { lastSeen: user.lastSeen }),
  };
};
