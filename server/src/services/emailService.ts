import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
});

export const sendVerificationEmail = async (
  email: string,
  name: string,
  token: string
): Promise<void> => {
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 10px;">
      <h2 style="color: #4f46e5;">Welcome to SecureConnect, ${name}!</h2>
      <p>Thank you for creating an account. Please click the button below to verify your email address:</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${verifyUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
      </div>
      <p style="color: #666; font-size: 12px;">Or copy and paste this link in your browser: <br/><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p style="color: #999; font-size: 11px;">This link will expire in ${env.EMAIL_VERIFICATION_EXPIRES_MINUTES} minutes.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: 'Verify your SecureConnect Account',
      html,
    });
    console.log(`[Email Service] Verification email sent to ${email}`);
  } catch (error) {
    console.warn(`[Email Service] SMTP dispatch failed (Dev fallback). Verification Link: ${verifyUrl}`);
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  token: string
): Promise<void> => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 10px;">
      <h2 style="color: #4f46e5;">Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>We received a request to reset your password for your SecureConnect account. Click the button below to reset it:</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
      </div>
      <p style="color: #666; font-size: 12px;">Or copy and paste this link in your browser: <br/><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="color: #999; font-size: 11px;">This link will expire in ${env.PASSWORD_RESET_EXPIRES_MINUTES} minutes. If you did not request this, please ignore this email.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: 'Reset your SecureConnect Password',
      html,
    });
    console.log(`[Email Service] Password reset email sent to ${email}`);
  } catch (error) {
    console.warn(`[Email Service] SMTP dispatch failed (Dev fallback). Reset Link: ${resetUrl}`);
  }
};
