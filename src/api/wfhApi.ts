import api from "./axios";
import type { ApiResponse, PaginatedResponse, WfhRequest } from "../types";

export const wfhApi = {
  apply: (data: { date: string; reason: string }) =>
    api.post<ApiResponse<WfhRequest>>("/wfh", data),

  getMyRequests: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<WfhRequest>>("/wfh/my", { params }),

  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<WfhRequest>>("/wfh", { params }),

  approve: (id: string, status: "approved" | "rejected") =>
    api.patch<ApiResponse<WfhRequest>>(`/wfh/${id}/approve`, { status }),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/wfh/${id}`),
};
