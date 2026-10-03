import mongoose from 'mongoose';
import { UserModel, IUserDocument } from '../models/UserModel.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateSecureToken, hashToken } from '../utils/crypto.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './emailService.js';
import { createSession, revokeSession, revokeAllUserSessions, SessionResult } from './sessionService.js';
import { serializeUser, SafeUser } from '../utils/userSerializer.js';
import { env } from '../config/env.js';
import { CustomError } from '../middleware/errorMiddleware.js';

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress: string;
}

export const registerUser = async (input: RegisterInput): Promise<{ message: string; email: string }> => {
  const emailNormalized = input.email.toLowerCase().trim();
  const usernameNormalized = input.username.toLowerCase().trim();

  // Check email collision
  const existingEmail = await UserModel.findOne({ email: emailNormalized });
  if (existingEmail) {
    const err: CustomError = new Error('An account with this email address already exists.');
    err.statusCode = 400;
    throw err;
  }

  // Check username collision
  const existingUsername = await UserModel.findOne({ username: usernameNormalized });
  if (existingUsername) {
    const err: CustomError = new Error('This username is already taken. Please choose another.');
    err.statusCode = 400;
    throw err;
  }

  // Hash Password
  const passwordHash = await hashPassword(input.password);

  // Check if real SMTP provider is configured
  const hasSmtpConfigured = Boolean(env.SMTP_USER && env.SMTP_PASSWORD);
  const isEmailVerified = !hasSmtpConfigured;

  let rawVerificationToken = '';
  let emailVerificationTokenHash: string | undefined = undefined;
  let emailVerificationExpiresAt: Date | undefined = undefined;

  if (hasSmtpConfigured) {
    rawVerificationToken = generateSecureToken(32);
    emailVerificationTokenHash = hashToken(rawVerificationToken);
    emailVerificationExpiresAt = new Date(
      Date.now() + env.EMAIL_VERIFICATION_EXPIRES_MINUTES * 60 * 1000
    );
  }

  const newUser = new UserModel({
    name: input.name.trim(),
    username: usernameNormalized,
    email: emailNormalized,
    passwordHash,
    emailVerified: isEmailVerified,
    emailVerificationTokenHash,
    emailVerificationExpiresAt,
  });

  await newUser.save();

  if (hasSmtpConfigured) {
    await sendVerificationEmail(newUser.email, newUser.name, rawVerificationToken);
  }

  return {
    message: hasSmtpConfigured
      ? 'Account created successfully. Please check your email to verify your account.'
      : 'Account created successfully. You can now log in.',
    email: newUser.email,
  };
};

export const verifyUserEmail = async (token: string): Promise<SafeUser> => {
  const hashedToken = hashToken(token);

  const user = await UserModel.findOne({
    emailVerificationTokenHash: hashedToken,
    emailVerificationExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    const err: CustomError = new Error('Invalid or expired email verification token.');
    err.statusCode = 400;
    throw err;
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();

  return serializeUser(user);
};

export const loginUser = async (
  input: LoginInput
): Promise<{ user: SafeUser; sessionResult: SessionResult }> => {
  const emailNormalized = input.email.toLowerCase().trim();

  const user = await UserModel.findOne({ email: emailNormalized });
  if (!user) {
    const err: CustomError = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  if (!user.isActive || user.isBlocked) {
    const err: CustomError = new Error('Your account has been deactivated or suspended.');
    err.statusCode = 403;
    throw err;
  }

  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
  if (!isPasswordValid) {
    const err: CustomError = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const hasSmtpConfigured = Boolean(env.SMTP_USER && env.SMTP_PASSWORD);

  if (!user.emailVerified) {
    if (!hasSmtpConfigured) {
      user.emailVerified = true;
      await user.save();
    } else {
      const err: CustomError = new Error('Email verification required. Please verify your email before logging in.');
      err.statusCode = 403;
      throw err;
    }
  }

  user.status = 'online';
  user.isOnline = true;
  user.lastSeen = new Date();
  await user.save();

  const sessionResult = await createSession({
    userId: user._id as mongoose.Types.ObjectId,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });

  return { user: serializeUser(user), sessionResult };
};

export const logoutUser = async (sessionId: string, userId?: string): Promise<void> => {
  if (sessionId) {
    await revokeSession(sessionId);
  }
  if (userId) {
    await UserModel.findByIdAndUpdate(userId, { status: 'offline', isOnline: false, lastSeen: new Date() });
  }
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  const emailNormalized = email.toLowerCase().trim();
  const user = await UserModel.findOne({ email: emailNormalized });

  // Generic security response regardless of whether email exists
  if (!user) return;

  const rawResetToken = generateSecureToken(32);
  const passwordResetTokenHash = hashToken(rawResetToken);
  const passwordResetExpiresAt = new Date(
    Date.now() + env.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000
  );

  user.passwordResetTokenHash = passwordResetTokenHash;
  user.passwordResetExpiresAt = passwordResetExpiresAt;
  await user.save();

  await sendPasswordResetEmail(user.email, user.name, rawResetToken);
};

export const resetUserPassword = async (token: string, newPassword: string): Promise<void> => {
  const hashedToken = hashToken(token);

  const user = await UserModel.findOne({
    passwordResetTokenHash: hashedToken,
    passwordResetExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    const err: CustomError = new Error('Invalid or expired password reset token.');
    err.statusCode = 400;
    throw err;
  }

  const newPasswordHash = await hashPassword(newPassword);

  user.passwordHash = newPasswordHash;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  // Revoke all existing sessions to enforce fresh login with new password
  await revokeAllUserSessions(user._id as mongoose.Types.ObjectId);
};
