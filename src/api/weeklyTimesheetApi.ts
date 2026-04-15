import api from "./axios";
import type {
  ApiResponse, PaginatedResponse, WeeklyTimesheetData, ActivityTypeItem,
  PolicyItem, TimesheetDashboardStats, ProjectTimeSummary, OvertimeEntry, User,
  EmployeeTimesheetStatus,
} from "../types";

export const weeklyTimesheetApi = {
  // Employee
  getCurrentWeek: (date?: string) =>
    api.get<ApiResponse<WeeklyTimesheetData>>("/weekly-timesheet/current", { params: date ? { date } : {} }),

  saveEntries: (weekStart: string, entries: unknown[]) =>
    api.post<ApiResponse<WeeklyTimesheetData>>("/weekly-timesheet/save", { weekStart, entries }),

  submit: (id: string) =>
    api.patch<ApiResponse<WeeklyTimesheetData>>(`/weekly-timesheet/${id}/submit`),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/weekly-timesheet/${id}`),

  getHistory: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<WeeklyTimesheetData>>("/weekly-timesheet/history", { params }),

  getDetail: (id: string) =>
    api.get<ApiResponse<WeeklyTimesheetData>>(`/weekly-timesheet/detail/${id}`),

  // Manager
  getPendingApprovals: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<WeeklyTimesheetData>>("/weekly-timesheet/approvals", { params }),

  approve: (id: string, status: "approved" | "rejected", comment?: string) =>
    api.patch<ApiResponse<WeeklyTimesheetData>>(`/weekly-timesheet/${id}/approve`, { status, comment }),

  getProjectSummary: (startDate: string, endDate: string) =>
    api.get<ApiResponse<ProjectTimeSummary[]>>("/weekly-timesheet/project-summary", { params: { startDate, endDate } }),

  // Admin
  getAll: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<WeeklyTimesheetData>>("/weekly-timesheet/all", { params }),

  getDashboardStats: () =>
    api.get<ApiResponse<TimesheetDashboardStats>>("/weekly-timesheet/dashboard-stats"),

  getMissing: (weekStart?: string) =>
    api.get<ApiResponse<User[]>>("/weekly-timesheet/missing", { params: weekStart ? { weekStart } : {} }),

  getOvertimeReport: (startDate: string, endDate: string) =>
    api.get<ApiResponse<OvertimeEntry[]>>("/weekly-timesheet/overtime", { params: { startDate, endDate } }),

  sendReminders: () =>
    api.post<ApiResponse<{ sent: number; weekLabel: string }>>("/weekly-timesheet/reminders/send"),

  getCompliance: (weeks = 8) =>
    api.get<ApiResponse<{ weeks: number; employees: { _id: string; name: string; email: string; department?: string; submitted: number; total: number; compliance: number }[] }>>("/weekly-timesheet/compliance", { params: { weeks } }),

  getEmployeesStatus: (weekStart?: string, department?: string) =>
    api.get<ApiResponse<EmployeeTimesheetStatus[]>>("/weekly-timesheet/employees-status", { params: { ...(weekStart ? { weekStart } : {}), ...(department ? { department } : {}) } }),

  // Config
  getActivityTypes: () =>
    api.get<ApiResponse<ActivityTypeItem[]>>("/weekly-timesheet/activity-types"),

  createActivityType: (name: string) =>
    api.post<ApiResponse<ActivityTypeItem>>("/weekly-timesheet/activity-types", { name }),

  deleteActivityType: (id: string) =>
    api.delete<ApiResponse>(`/weekly-timesheet/activity-types/${id}`),

  getPolicies: () =>
    api.get<ApiResponse<PolicyItem[]>>("/weekly-timesheet/policies"),

  upsertPolicy: (key: string, value: unknown, label?: string) =>
    api.put<ApiResponse<PolicyItem>>("/weekly-timesheet/policies", { key, value, label }),
};
