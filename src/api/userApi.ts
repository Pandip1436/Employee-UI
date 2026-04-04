import api from "./axios";
import type { ApiResponse, PaginatedResponse, User } from "../types";

export const userApi = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<User>>("/users", { params }),

  getById: (id: string) =>
    api.get<ApiResponse<User>>(`/users/${id}`),

  update: (id: string, data: Partial<User>) =>
    api.put<ApiResponse<User>>(`/users/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/users/${id}`),
};
