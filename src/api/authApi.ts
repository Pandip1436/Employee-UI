import api from "./axios";
import type { ApiResponse, AuthData } from "../types";

export const authApi = {
  login: (data: { userId: string; password: string }) =>
    api.post<ApiResponse<AuthData>>("/auth/login", data),

  getMe: () => api.get<ApiResponse<AuthData["user"]>>("/auth/me"),

  logout: () => api.post<ApiResponse>("/auth/logout"),

  updateProfile: (data: { name?: string; email?: string; department?: string }) =>
    api.put<ApiResponse<AuthData["user"]>>("/auth/profile", data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<ApiResponse>("/auth/change-password", data),
};
