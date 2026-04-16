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

  getReport: (period: "daily" | "weekly" | "monthly", date: string, userId?: string) =>
    api.get<ApiResponse>("/attendance/report/monthly", { params: { period, date, userId } }),

  exportExcel: (period: "daily" | "weekly" | "monthly", date: string, userId?: string) =>
    api.get("/attendance/report/export-excel", {
      params: { period, date, userId },
      responseType: "blob",
    }),

  exportPdf: (period: "daily" | "weekly" | "monthly", date: string, userId?: string) =>
    api.get("/attendance/report/export-pdf", {
      params: { period, date, userId },
      responseType: "blob",
    }),
};
