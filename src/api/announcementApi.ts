import api from "./axios";
import type { ApiResponse, PaginatedResponse } from "../types";

export interface AnnouncementData {
  _id: string;
  title: string;
  content: string;
  category: string;
  author: { _id: string; name: string; email: string };
  tags: string[];
  attachments: string[];
  reactions: { like: string[]; love: string[]; celebrate: string[] };
  comments: { _id?: string; userId: { _id: string; name: string }; text: string; createdAt: string }[];
  isPinned: boolean;
  isPublished: boolean;
  targetAudience: string;
  createdAt: string;
}

export const announcementApi = {
  getAll: (params?: Record<string, string | number>) => api.get<PaginatedResponse<AnnouncementData>>("/announcements", { params }),
  getById: (id: string) => api.get<ApiResponse<AnnouncementData>>(`/announcements/${id}`),
  create: (data: Record<string, unknown>) => api.post<ApiResponse<AnnouncementData>>("/announcements", data),
  update: (id: string, data: Record<string, unknown>) => api.put<ApiResponse<AnnouncementData>>(`/announcements/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse>(`/announcements/${id}`),
  react: (id: string, type: string) => api.post<ApiResponse<AnnouncementData>>(`/announcements/${id}/react`, { type }),
  comment: (id: string, text: string) => api.post<ApiResponse<AnnouncementData>>(`/announcements/${id}/comment`, { text }),
};
