import api from "./axios";
import type { ApiResponse, EmployeeReport, ProjectReport, WeeklySummary } from "../types";

export const reportApi = {
  getEmployeeReport: (params: { startDate: string; endDate: string; userId?: string }) =>
    api.get<ApiResponse<EmployeeReport[]>>("/reports/employee", { params }),

  getProjectReport: (params: { startDate: string; endDate: string; projectId?: string }) =>
    api.get<ApiResponse<ProjectReport[]>>("/reports/project", { params }),

  getWeeklySummary: (userId?: string) =>
    api.get<ApiResponse<WeeklySummary>>("/reports/weekly-summary", { params: userId ? { userId } : {} }),
};
