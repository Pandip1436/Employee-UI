import api from "./axios";
import type { ApiResponse, PaginatedResponse, CompOffRequest, CompOffBalance } from "../types";

export const compOffApi = {
  apply: (data: { workedDate: string; hoursWorked: number; reason: string }) =>
    api.post<ApiResponse<CompOffRequest>>("/compoff", data),

  getMyRequests: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<CompOffRequest>>("/compoff/my", { params }),

  getBalance: () =>
    api.get<ApiResponse<CompOffBalance>>("/compoff/balance"),

  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<CompOffRequest>>("/compoff", { params }),

  approve: (id: string, status: "approved" | "rejected") =>
    api.patch<ApiResponse<CompOffRequest>>(`/compoff/${id}/approve`, { status }),

  markUsed: (id: string) =>
    api.patch<ApiResponse<CompOffRequest>>(`/compoff/${id}/use`),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/compoff/${id}`),
};
