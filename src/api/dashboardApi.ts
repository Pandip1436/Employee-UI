import api from "./axios";
import type { ApiResponse } from "../types";

export interface EmployeeKpis {
  attendanceDays: number;
  attendancePercent: number;
  totalHoursThisMonth: number;
  leaveDaysTaken: number;
  todayStatus: { clockIn: string | null; clockOut: string | null; status: string; totalHours: number | null } | null;
  pendingTimesheets: number;
}

export interface ManagerStats {
  pendingLeaves: number;
  pendingTimesheets: number;
  totalEmployees: number;
  todayPresent: number;
  todayAbsent: number;
}

export interface HrStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  newJoinersThisMonth: { _id: string; name: string; email: string; department?: string; createdAt: string }[];
  leaveStats: { _id: string; totalDays: number; count: number }[];
  todayPresent: number;
  todayAbsent: number;
  attritionRate: number;
}

export interface PendingApprovalItem {
  _id: string;
  type: "leave" | "timesheet";
  employee: { name: string; email: string };
  leaveType?: string;
  days?: number;
  startDate?: string;
  weekStart?: string;
  totalHours?: number;
  createdAt?: string;
  submittedAt?: string;
}

export interface TeamLeaveEntry {
  employee: string;
  department: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
}

export const dashboardApi = {
  getEmployeeKpis: () =>
    api.get<ApiResponse<EmployeeKpis>>("/dashboard/employee-kpis"),

  getManagerStats: () =>
    api.get<ApiResponse<ManagerStats>>("/dashboard/manager-stats"),

  getHrStats: () =>
    api.get<ApiResponse<HrStats>>("/dashboard/hr-stats"),

  getUpcomingEvents: () =>
    api.get<ApiResponse<{ anniversaries: { _id: string; name: string; email: string; department?: string; years: number; eventDate: string }[] }>>("/dashboard/upcoming-events"),

  getPendingApprovals: () =>
    api.get<ApiResponse<{ leaves: PendingApprovalItem[]; timesheets: PendingApprovalItem[] }>>("/dashboard/pending-approvals"),

  getTeamLeaveCalendar: (month?: string) =>
    api.get<ApiResponse<TeamLeaveEntry[]>>("/dashboard/team-leave-calendar", { params: month ? { month } : {} }),
};
