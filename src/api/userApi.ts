import api from "./axios";
import type { ApiResponse, PaginatedResponse, User } from "../types";

export const userApi = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<User>>("/users", { params }),

  getById: (id: string) =>
    api.get<ApiResponse<User>>(`/users/${id}`),

  create: (data: {
    name: string;
    email: string;
    userId: string;
    password: string;
    role?: string;
    department?: string;
  }) => api.post<ApiResponse<User>>("/users", data),

  update: (id: string, data: Partial<User>) =>
    api.put<ApiResponse<User>>(`/users/${id}`, data),

  resetPassword: (id: string, password: string) =>
    api.put<ApiResponse>(`/users/${id}/password`, { password }),

  bulkAction: (ids: string[], action: "activate" | "deactivate" | "delete") =>
    api.post<ApiResponse>("/users/bulk-action", { ids, action }),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/users/${id}`),
};
