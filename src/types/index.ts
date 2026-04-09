export type UserRole = "admin" | "manager" | "employee";
export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";
export type ProjectStatus = "active" | "completed" | "on-hold";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  client: string;
  status: ProjectStatus;
  assignedUsers: User[];
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface Timesheet {
  _id: string;
  userId: User;
  projectId: Project;
  date: string;
  hours: number;
  description: string;
  status: TimesheetStatus;
  approvedBy?: User;
  rejectionComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Timer {
  _id: string;
  userId: string;
  projectId: Project;
  description: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  isRunning: boolean;
  createdAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: Pagination;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: Pagination;
}

export interface AuthData {
  user: User;
  token: string;
}

export interface EmployeeReport {
  userId: string;
  userName: string;
  email: string;
  totalHours: number;
  approvedHours: number;
  totalEntries: number;
}

export interface ProjectReport {
  projectId: string;
  projectName: string;
  client: string;
  totalHours: number;
  totalEntries: number;
  employeeCount: number;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  dailyBreakdown: {
    _id: string;
    totalHours: number;
    entries: number;
  }[];
}

// ── Attendance ──
export type AttendanceStatus = "present" | "absent" | "late" | "half-day" | "on-leave";

export interface AttendanceRecord {
  _id: string;
  userId: User;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  status: AttendanceStatus;
  notes?: string;
  isLate?: boolean;
  lateByMinutes?: number;
  createdAt: string;
}

export type LiveStatus = "clocked-in" | "clocked-out" | "not-marked" | "late";

export interface LiveEmployee {
  _id: string;
  name: string;
  email: string;
  department?: string;
  role: string;
  liveStatus: LiveStatus;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  status: AttendanceStatus | null;
}

export interface LiveStatusData {
  summary: {
    total: number;
    clockedIn: number;
    late: number;
    clockedOut: number;
    notMarked: number;
  };
  employees: LiveEmployee[];
}

// ── Leave ──
export type LeaveStatus = "pending" | "approved" | "rejected";
export type LeaveType = "casual" | "sick" | "earned" | "unpaid" | "compoff";

export interface LeaveRequest {
  _id: string;
  userId: User;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approvedBy?: User;
  rejectionComment?: string;
  createdAt: string;
}

export interface LeaveBalance {
  casual: { total: number; used: number; remaining: number };
  sick: { total: number; used: number; remaining: number };
  earned: { total: number; used: number; remaining: number };
  compoff: { total: number; used: number; remaining: number };
}

// ── Document ──
export interface DocumentFile {
  _id: string;
  name: string;
  originalName: string;
  category: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedBy: User;
  access: "all" | "admin" | "hr";
  createdAt: string;
}

// ── Employee Profile ──
export interface WorkHistoryEntry {
  company: string;
  role: string;
  from: string;
  to: string;
  description?: string;
}

export interface CertificationEntry {
  name: string;
  issuer?: string;
  year?: string;
}

export interface EmployeeProfile {
  _id: string;
  userId: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  profilePhoto?: string;
  personalEmail?: string;
  phone?: string;
  address?: string;
  employeeId?: string;
  designation?: string;
  joiningDate?: string;
  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;
  bankAccountNumber?: string;
  bankAccountNumberMasked?: string;
  bankIfsc?: string;
  bankName?: string;
  aadhaarNumber?: string;
  aadhaarNumberMasked?: string;
  panNumber?: string;
  panNumberMasked?: string;
  passportNumber?: string;
  passportNumberMasked?: string;
  offerLetterPath?: string;
  certificatePaths?: string[];
  workHistory?: WorkHistoryEntry[];
  skills?: string[];
  certifications?: CertificationEntry[];
  createdAt: string;
  updatedAt: string;
}

// ── Holiday ──
export interface Holiday {
  _id: string;
  name: string;
  date: string;
  type: "public" | "restricted" | "company";
  description?: string;
}

// ── WFH Request ──
export interface WfhRequest {
  _id: string;
  userId: User;
  date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: User;
  createdAt: string;
}

// ── Comp-Off ──
export interface CompOffRequest {
  _id: string;
  userId: User;
  workedDate: string;
  hoursWorked: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "used" | "expired";
  approvedBy?: User;
  usedDate?: string;
  expiryDate?: string;
  createdAt: string;
}

export interface CompOffBalance {
  earned: number;
  used: number;
  available: number;
  pending: number;
  expired: number;
  expiringSoon: number;
  cap?: number;
}

// ── Weekly Timesheet ──
export interface TimesheetEntry {
  projectId: Project | string;
  task: string;
  activityType: string;
  hours: number[];
  notes?: string;
}

export interface WeeklyTimesheetData {
  _id: string;
  userId: User | string;
  weekStart: string;
  weekEnd: string;
  entries: TimesheetEntry[];
  totalHours: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedAt?: string;
  approvedBy?: User;
  approvedAt?: string;
  managerComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityTypeItem {
  _id: string;
  name: string;
  isActive: boolean;
}

export interface PolicyItem {
  _id: string;
  key: string;
  value: unknown;
  label?: string;
}

export interface TimesheetDashboardStats {
  submitted: number;
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  weekStart: string;
}

export interface ProjectTimeSummary {
  projectId: string;
  projectName: string;
  client: string;
  totalHours: number;
}

export interface OvertimeEntry {
  employee: User;
  weekStart: string;
  totalHours: number;
  overtime: number;
}

export interface EmployeeTimesheetStatus {
  _id: string;
  name: string;
  email: string;
  department: string | null;
  status: "draft" | "submitted" | "approved" | "rejected" | "not_started";
  totalHours: number;
  submittedAt: string | null;
  approvedAt: string | null;
  managerComment: string | null;
  sheetId: string | null;
}
