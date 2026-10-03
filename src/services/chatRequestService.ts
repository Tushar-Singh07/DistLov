import { apiClient } from './api';
import { ChatRequest, ChatStatusResult, Conversation } from '../types';

export const chatRequestService = {
  async sendRequest(receiverId: string, message?: string): Promise<{ request: ChatRequest; conversation?: Conversation; autoAccepted?: boolean }> {
    const res = await apiClient.post<{ success: boolean; data: any }>('/chat-requests', { receiverId, message });
    return (res as any).data;
  },

  async getPendingRequests(): Promise<{ incoming: ChatRequest[]; outgoing: ChatRequest[] }> {
    const res = await apiClient.get<{ success: boolean; data: { incoming: ChatRequest[]; outgoing: ChatRequest[] } }>('/chat-requests/pending');
    return (res as any).data || { incoming: [], outgoing: [] };
  },

  async acceptRequest(requestId: string): Promise<{ request: ChatRequest; conversation: Conversation }> {
    const res = await apiClient.post<{ success: boolean; data: { request: ChatRequest; conversation: Conversation } }>(`/chat-requests/${requestId}/accept`);
    return (res as any).data;
  },

  async declineRequest(requestId: string): Promise<{ request: ChatRequest }> {
    const res = await apiClient.post<{ success: boolean; data: { request: ChatRequest } }>(`/chat-requests/${requestId}/decline`);
    return (res as any).data;
  },

  async cancelRequest(requestId: string): Promise<{ request: ChatRequest }> {
    const res = await apiClient.post<{ success: boolean; data: { request: ChatRequest } }>(`/chat-requests/${requestId}/cancel`);
    return (res as any).data;
  },

  async getStatusWithUser(targetUserId: string): Promise<ChatStatusResult> {
    const res = await apiClient.get<{ success: boolean; data: ChatStatusResult }>(`/chat-requests/status/${targetUserId}`);
    return (res as any).data;
  }
};
