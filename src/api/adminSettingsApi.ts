import api from "./axios";
import type { ApiResponse, PaginatedResponse } from "../types";

export interface CompanySettingsData {
  companyName: string;
  logo?: string;
  timezone: string;
  fiscalYearStart: string;
  workingDays: string[];
  departments: { name: string; description?: string }[];
  designations: { name: string; level: number; grade: string }[];
  roles: { name: string; description?: string; permissions: string[] }[];
  leavePolicy: Record<string, { total: number; carryForward: boolean; maxCarry?: number }>;
  emailTemplates: { key: string; subject: string; body: string }[];
}

export interface AuditLogEntry {
  _id: string;
  userId: { _id: string; name: string; email: string };
  action: string;
  module: string;
  details?: string;
  createdAt: string;
}

export const adminSettingsApi = {
  getPublicCompanyInfo: () =>
    api.get<ApiResponse<Pick<CompanySettingsData, "companyName" | "logo" | "timezone" | "fiscalYearStart" | "workingDays">>>("/company-info"),
  getCompanySettings: () => api.get<ApiResponse<CompanySettingsData>>("/admin/settings/company"),
  updateCompanySettings: (data: Partial<CompanySettingsData>) => api.put<ApiResponse<CompanySettingsData>>("/admin/settings/company", data),
  getDepartments: () => api.get<ApiResponse<CompanySettingsData["departments"]>>("/admin/settings/departments"),
  updateDepartments: (departments: CompanySettingsData["departments"]) => api.put<ApiResponse>("/admin/settings/departments", { departments }),
  getDesignations: () => api.get<ApiResponse<CompanySettingsData["designations"]>>("/admin/settings/designations"),
  updateDesignations: (designations: CompanySettingsData["designations"]) => api.put<ApiResponse>("/admin/settings/designations", { designations }),
  getRoles: () => api.get<ApiResponse<CompanySettingsData["roles"]>>("/admin/settings/roles"),
  getRoleUserCounts: () => api.get<ApiResponse<Record<string, number>>>("/admin/settings/roles/user-counts"),
  updateRoles: (roles: CompanySettingsData["roles"]) => api.put<ApiResponse>("/admin/settings/roles", { roles }),
  getLeavePolicy: () => api.get<ApiResponse<CompanySettingsData["leavePolicy"]>>("/admin/settings/leave-policy"),
  updateLeavePolicy: (data: CompanySettingsData["leavePolicy"]) => api.put<ApiResponse>("/admin/settings/leave-policy", data),
  getEmailTemplates: () => api.get<ApiResponse<CompanySettingsData["emailTemplates"]>>("/admin/settings/email-templates"),
  updateEmailTemplates: (templates: CompanySettingsData["emailTemplates"]) => api.put<ApiResponse>("/admin/settings/email-templates", { templates }),
  getAuditLogs: (params?: Record<string, string | number>) => api.get<PaginatedResponse<AuditLogEntry>>("/admin/settings/audit-logs", { params }),
  deleteAuditLog: (id: string) => api.delete<ApiResponse>(`/admin/settings/audit-logs/${id}`),
  clearAuditLogs: (params?: Record<string, string>) =>
    api.delete<ApiResponse<{ deletedCount: number }>>("/admin/settings/audit-logs", { params }),
};
