import api from "./axios";
import type { ApiResponse, PaginatedResponse, LeaveRequest, LeaveBalance } from "../types";

export const leaveApi = {
  apply: (data: { type: string; startDate: string; endDate: string; reason: string }) =>
    api.post<ApiResponse<LeaveRequest>>("/leaves", data),

  getMyLeaves: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<LeaveRequest>>("/leaves/my", { params }),

  getBalance: () =>
    api.get<ApiResponse<LeaveBalance>>("/leaves/balance"),

  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<LeaveRequest>>("/leaves", { params }),

  approve: (id: string, data: { status: "approved" | "rejected"; rejectionComment?: string }) =>
    api.patch<ApiResponse<LeaveRequest>>(`/leaves/${id}/approve`, data),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/leaves/${id}`),
};
