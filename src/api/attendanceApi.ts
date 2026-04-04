import api from "./axios";
import type { ApiResponse, PaginatedResponse, AttendanceRecord, LiveStatusData } from "../types";

export const attendanceApi = {
  clockIn: (notes?: string) =>
    api.post<ApiResponse<AttendanceRecord>>("/attendance/clock-in", { notes }),

  clockOut: (notes?: string) =>
    api.post<ApiResponse<AttendanceRecord>>("/attendance/clock-out", { notes }),

  getMyToday: () =>
    api.get<ApiResponse<AttendanceRecord | null>>("/attendance/my-today"),

  getMyHistory: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<AttendanceRecord>>("/attendance/my-history", { params }),

  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<AttendanceRecord>>("/attendance", { params }),

  getLiveStatus: () =>
    api.get<ApiResponse<LiveStatusData>>("/attendance/live-status"),

  getMonthlyReport: (month: string, userId?: string) =>
    api.get<ApiResponse>("/attendance/report/monthly", { params: { month, userId } }),

  exportExcel: (month: string, userId?: string) =>
    api.get("/attendance/report/export-excel", {
      params: { month, userId },
      responseType: "blob",
    }),

  exportPdf: (month: string, userId?: string) =>
    api.get("/attendance/report/export-pdf", {
      params: { month, userId },
      responseType: "blob",
    }),
};
