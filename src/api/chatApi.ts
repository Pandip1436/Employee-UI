import api from "./axios";
import type { ApiResponse, PaginatedResponse } from "../types";

export interface ConversationData {
  _id: string;
  type: "direct" | "group";
  participants: { _id: string; name: string; email: string; department?: string }[];
  name?: string;
  lastMessage?: { text: string; senderId: string | { _id: string; name: string }; createdAt: string };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageData {
  _id: string;
  conversationId: string;
  senderId: { _id: string; name: string; email: string } | string;
  text: string;
  readBy: string[];
  createdAt: string;
}

export const chatApi = {
  getOrCreateDirect: (userId: string) =>
    api.post<ApiResponse<ConversationData>>("/chat/direct", { userId }),

  createGroup: (name: string, participants: string[]) =>
    api.post<ApiResponse<ConversationData>>("/chat/group", { name, participants }),

  getMyConversations: () =>
    api.get<ApiResponse<ConversationData[]>>("/chat/conversations"),

  sendMessage: (conversationId: string, text: string) =>
    api.post<ApiResponse<MessageData>>(`/chat/${conversationId}/messages`, { text }),

  getMessages: (conversationId: string, params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<MessageData>>(`/chat/${conversationId}/messages`, { params }),

  addParticipants: (conversationId: string, participants: string[]) =>
    api.post<ApiResponse<ConversationData>>(`/chat/${conversationId}/participants`, { participants }),

  markAsRead: (conversationId: string) =>
    api.patch<ApiResponse>(`/chat/${conversationId}/read`),

  getUnreadCount: () =>
    api.get<ApiResponse<{ total: number }>>("/chat/unread-count"),

  deleteMessage: (messageId: string) =>
    api.delete<ApiResponse>(`/chat/messages/${messageId}`),
};
