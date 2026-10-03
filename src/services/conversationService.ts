import { apiClient } from './api';
import { Conversation } from '../types';

export const conversationService = {
  async getConversations(): Promise<Conversation[]> {
    const res = await apiClient.get<{ success: boolean; data: Conversation[] }>('/conversations');
    return (res as any).data || [];
  },

  async createDirectConversation(userId: string): Promise<Conversation> {
    const res = await apiClient.post<{ success: boolean; data: Conversation }>('/conversations/direct', { userId });
    return (res as any).data;
  },

  async getConversation(conversationId: string): Promise<Conversation> {
    const res = await apiClient.get<{ success: boolean; data: Conversation }>(`/conversations/${conversationId}`);
    return (res as any).data;
  },

  async markRead(conversationId: string): Promise<void> {
    await apiClient.post(`/conversations/${conversationId}/read`);
  },

  async clearChat(conversationId: string): Promise<void> {
    await apiClient.delete(`/conversations/${conversationId}/messages`);
  },

  async createGroupConversation(name: string, participantIds: string[], avatarUrl?: string): Promise<Conversation> {
    // Reserved for group chat phase
    const newGroup: Conversation = {
      id: `conv_group_${Date.now()}`,
      type: 'group',
      name,
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
      ownerId: 'usr_me',
      admins: ['usr_me'],
      participants: [
        { userId: 'usr_me', role: 'admin', unreadCount: 0 },
        ...participantIds.map(id => ({ userId: id, role: 'member' as const, unreadCount: 0 }))
      ],
      updatedAt: 'Just now',
      isMuted: false
    };
    return Promise.resolve(newGroup);
  }
};

