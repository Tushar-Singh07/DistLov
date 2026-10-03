import { apiClient } from './api';
import { User } from '../types';

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    try {
      const res: any = await apiClient.get('/auth/me');
      return res.data?.user || null;
    } catch (err) {
      return null;
    }
  },

  async login(payload: LoginPayload): Promise<User> {
    const res: any = await apiClient.post('/auth/login', payload);
    return res.data.user;
  },

  async signup(payload: RegisterPayload): Promise<{ message: string; email: string }> {
    const res: any = await apiClient.post('/auth/register', payload);
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore if session already cleared
    }
  },

  async verifyEmail(token: string): Promise<User> {
    const res: any = await apiClient.post('/auth/verify-email', { token });
    return res.data.user;
  },

  async requestPasswordReset(email: string): Promise<string> {
    const res: any = await apiClient.post('/auth/forgot-password', { email });
    return res.message;
  },

  async resetPassword(token: string, newPassword: string): Promise<string> {
    const res: any = await apiClient.post('/auth/reset-password', { token, password: newPassword });
    return res.message;
  }
};
