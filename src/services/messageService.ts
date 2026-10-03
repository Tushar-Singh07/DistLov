import { apiClient } from './api';
import { socketService } from './socketService';
import { Message, MessageType, Attachment } from '../types';

export const messageService = {
  async getMessages(conversationId: string, limit: number = 50, before?: string): Promise<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (before) params.append('before', before);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<{ success: boolean; data: { messages: Message[]; nextCursor: string | null; hasMore: boolean } }>(
      `/conversations/${conversationId}/messages${queryString}`
    );
    return (res as any).data || { messages: [], nextCursor: null, hasMore: false };
  },

  async sendMessage(
    conversationId: string,
    content: string,
    messageType: MessageType = 'text',
    replyToMessageId?: string,
    attachments?: Attachment[]
  ): Promise<void> {
    const attachmentIds = attachments?.map(a => a.id || (a as any).attachmentId).filter(Boolean);
    socketService.sendMessage(conversationId, content, replyToMessageId, attachmentIds, messageType);
  },

  async uploadAttachment(
    conversationId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<Attachment> {
    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('file', file);

    const res = await apiClient.post<{ success: boolean; attachment: Attachment }>('/attachments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return (res as any).attachment || (res as any).data?.attachment;
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    await apiClient.delete(`/attachments/${attachmentId}`);
  },

  async editMessage(conversationId: string, messageId: string, content: string): Promise<Message> {
    socketService.editMessage(messageId, content);
    const res = await apiClient.patch<{ success: boolean; data: Message }>(`/messages/${messageId}`, { content });
    return (res as any).data;
  },

  async deleteMessage(conversationId: string, messageId: string): Promise<Message> {
    socketService.deleteMessage(messageId);
    const res = await apiClient.delete<{ success: boolean; data: Message }>(`/messages/${messageId}`);
    return (res as any).data;
  },

  async addReaction(conversationId: string, messageId: string, emoji: string): Promise<Message> {
    socketService.addReaction(messageId, emoji);
    const res = await apiClient.post<{ success: boolean; data: Message }>(`/messages/${messageId}/reactions`, { emoji });
    return (res as any).data;
  },

  async removeReaction(conversationId: string, messageId: string, emoji: string): Promise<Message> {
    socketService.removeReaction(messageId, emoji);
    const res = await apiClient.delete<{ success: boolean; data: Message }>(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
    return (res as any).data;
  },

  async searchMessages(conversationId: string, query: string): Promise<Message[]> {
    if (!query.trim()) return [];
    const res = await apiClient.get<{ success: boolean; data: Message[] }>(
      `/conversations/${conversationId}/messages/search?q=${encodeURIComponent(query)}`
    );
    return (res as any).data || [];
  }
};


