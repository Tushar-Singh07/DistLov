import mongoose from 'mongoose';
import { SessionModel, ISessionDocument } from '../models/SessionModel.js';
import { generateSecureToken, hashToken } from '../utils/crypto.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.js';

export interface CreateSessionParams {
  userId: mongoose.Types.ObjectId;
  userAgent?: string;
  ipAddress: string;
}

export interface SessionResult {
  session: ISessionDocument;
  accessToken: string;
  refreshToken: string;
}

export const createSession = async (params: CreateSessionParams): Promise<SessionResult> => {
  const sessionId = generateSecureToken(16);
  const rawRefreshToken = generateSecureToken(32);
  const refreshTokenHash = hashToken(rawRefreshToken);

  // Expiration: 7 days from now
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = new SessionModel({
    userId: params.userId,
    sessionId,
    refreshTokenHash,
    deviceName: params.userAgent?.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
    deviceType: params.userAgent?.includes('Mobile') ? 'mobile' : 'desktop',
    browser: params.userAgent || 'Unknown Browser',
    operatingSystem: 'Web',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent || '',
    lastActiveAt: new Date(),
    expiresAt,
    isValid: true,
  });

  await session.save();

  const tokenPayload = { userId: params.userId.toString(), sessionId };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return { session, accessToken, refreshToken };
};

export const revokeSession = async (sessionId: string): Promise<void> => {
  await SessionModel.updateOne(
    { sessionId },
    { $set: { isValid: false, revokedAt: new Date() } }
  );
};

export const revokeAllUserSessions = async (userId: mongoose.Types.ObjectId | string): Promise<void> => {
  await SessionModel.updateMany(
    { userId, isValid: true },
    { $set: { isValid: false, revokedAt: new Date() } }
  );
};

export const findValidSession = async (sessionId: string): Promise<ISessionDocument | null> => {
  const session = await SessionModel.findOne({ sessionId, isValid: true });
  if (!session) return null;
  if (session.expiresAt && session.expiresAt < new Date()) {
    session.isValid = false;
    await session.save();
    return null;
  }
  return session;
};
