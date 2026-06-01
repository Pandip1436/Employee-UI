import api from "./axios";
import type { ApiResponse, PaginatedResponse } from "../types";

export interface RecognitionData {
  _id: string;
  fromUser: { _id: string; name: string; email: string; department?: string; profilePhotoUrl?: string | null };
  toUser: { _id: string; name: string; email: string; department?: string; profilePhotoUrl?: string | null };
  message: string;
  badge: string;
  reactions: { like: string[] };
  comments: { userId: { name: string }; text: string; createdAt: string }[];
  createdAt: string;
}

export const recognitionApi = {
  getAll: (params?: Record<string, string | number>) => api.get<PaginatedResponse<RecognitionData>>("/recognition", { params }),
  create: (data: { toUser: string; message: string; badge: string }) => api.post<ApiResponse<RecognitionData>>("/recognition", data),
  update: (id: string, data: { message?: string; badge?: string }) =>
    api.patch<ApiResponse<RecognitionData>>(`/recognition/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse>(`/recognition/${id}`),
  react: (id: string) => api.post<ApiResponse>(`/recognition/${id}/react`),
  comment: (id: string, text: string) => api.post<ApiResponse>(`/recognition/${id}/comment`, { text }),
};
