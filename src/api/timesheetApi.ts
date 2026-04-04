import api from "./axios";
import type { ApiResponse, PaginatedResponse, Timesheet } from "../types";

export const timesheetApi = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Timesheet>>("/timesheets", { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Timesheet>>(`/timesheets/${id}`),

  create: (data: { projectId: string; date: string; hours: number; description: string }) =>
    api.post<ApiResponse<Timesheet>>("/timesheets", data),

  update: (id: string, data: Partial<{ projectId: string; date: string; hours: number; description: string }>) =>
    api.put<ApiResponse<Timesheet>>(`/timesheets/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/timesheets/${id}`),

  submit: (id: string) =>
    api.patch<ApiResponse<Timesheet>>(`/timesheets/${id}/submit`),

  approve: (id: string, data: { status: "approved" | "rejected"; rejectionComment?: string }) =>
    api.patch<ApiResponse<Timesheet>>(`/timesheets/${id}/approve`, data),
};
