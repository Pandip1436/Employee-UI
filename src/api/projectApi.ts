import api from "./axios";
import type { ApiResponse, PaginatedResponse, Project } from "../types";

export const projectApi = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Project>>("/projects", { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Project>>(`/projects/${id}`),

  create: (data: { name: string; client: string; description?: string; assignedUsers?: string[] }) =>
    api.post<ApiResponse<Project>>("/projects", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Project>>(`/projects/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/projects/${id}`),
};
