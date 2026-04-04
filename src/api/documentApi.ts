import api from "./axios";
import type { ApiResponse, PaginatedResponse, DocumentFile } from "../types";

export const documentApi = {
  upload: (formData: FormData) =>
    api.post<ApiResponse<DocumentFile>>("/documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<DocumentFile>>("/documents", { params }),

  getById: (id: string) =>
    api.get<ApiResponse<DocumentFile>>(`/documents/${id}`),

  download: (id: string) =>
    api.get(`/documents/${id}/download`, { responseType: "blob" }),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/documents/${id}`),
};
