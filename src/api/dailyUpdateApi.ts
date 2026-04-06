import api from "./axios";
import type { ApiResponse, PaginatedResponse } from "../types";

export interface DailyUpdateData {
  _id: string;
  userId: { _id: string; name: string; email: string; department?: string } | string;
  date: string;
  tasks: string;
  links: string;
  status: "completed" | "in-progress" | "blocked";
  proof?: string;
  planForTomorrow: string;
  createdAt: string;
  updatedAt: string;
}

export const dailyUpdateApi = {
  create: (data: {
    date: string;
    tasks: string;
    links?: string;
    status: string;
    proof?: string;
    planForTomorrow: string;
  }) => api.post<ApiResponse<DailyUpdateData>>("/daily-updates", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<DailyUpdateData>>(`/daily-updates/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/daily-updates/${id}`),

  getMyUpdates: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<DailyUpdateData>>("/daily-updates/my", { params }),

  getTeamUpdates: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<DailyUpdateData>>("/daily-updates/team/all", { params }),

  getById: (id: string) =>
    api.get<ApiResponse<DailyUpdateData>>(`/daily-updates/${id}`),
};
