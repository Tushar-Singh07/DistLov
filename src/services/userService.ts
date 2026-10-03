import { apiClient } from './api';
import { User, PrivacySettings, SessionDevice } from '../types';
import { mockSessions } from '../mock/users';

export const userService = {
  async getMyProfile(): Promise<User> {
    const res = await apiClient.get<{ success: boolean; data: User }>('/users/me');
    return (res as any).data;
  },

  async getUsers(): Promise<User[]> {
    const res = await apiClient.get<{ success: boolean; data: User[] }>('/users/search?q=');
    return (res as any).data || [];
  },

  async searchUsers(query: string): Promise<User[]> {
    if (!query.trim()) return [];
    const res = await apiClient.get<{ success: boolean; data: User[] }>(`/users/search?q=${encodeURIComponent(query)}`);
    return (res as any).data || [];
  },

  async getPublicProfile(username: string): Promise<User> {
    const res = await apiClient.get<{ success: boolean; data: User }>(`/users/${encodeURIComponent(username)}`);
    return (res as any).data;
  },

  async updateProfile(updates: { name?: string; username?: string; bio?: string; profilePhoto?: string | null }): Promise<User> {
    const res = await apiClient.patch<{ success: boolean; data: User }>('/users/me', updates);
    return (res as any).data;
  },

  async blockUser(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/block`);
  },

  async unblockUser(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}/block`);
  },

  async getPrivacySettings(): Promise<PrivacySettings> {
    const res = await apiClient.get<{ success: boolean; data: PrivacySettings }>('/users/me/privacy');
    return (res as any).data;
  },

  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
    const res = await apiClient.patch<{ success: boolean; data: PrivacySettings }>('/users/me/privacy', settings);
    return (res as any).data;
  },

  async getSessions(): Promise<SessionDevice[]> {
    return Promise.resolve(mockSessions);
  },

  async revokeSession(id: string): Promise<void> {
    const idx = mockSessions.findIndex(s => s.id === id);
    if (idx !== -1) mockSessions.splice(idx, 1);
    return Promise.resolve();
  }
};

