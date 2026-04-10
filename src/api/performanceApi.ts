import api from "./axios";
import type { ApiResponse } from "../types";

export interface GoalKpi { name: string; target: number; current: number; unit: string; }
export interface GoalMilestone { _id?: string; title: string; dueDate?: string; completed: boolean; completedAt?: string; }
export interface GoalCheckIn { _id?: string; progress: number; note?: string; createdBy?: { name: string }; createdAt: string; }
export interface GoalData {
  _id: string; userId: string | { _id: string; name: string; email: string; department?: string };
  title: string; description?: string;
  category: "individual" | "team" | "company";
  priority: "high" | "medium" | "low";
  period: string; year: number;
  visibility: "private" | "team" | "company";
  weightage: number;
  parentGoalId?: { _id: string; title: string } | string | null;
  kpis: GoalKpi[]; milestones: GoalMilestone[]; checkIns: GoalCheckIn[];
  progress: number; status: string;
  startDate?: string; dueDate?: string; completedAt?: string; createdAt: string;
}
export interface GoalStats { total: number; completed: number; onTrack: number; atRisk: number; behind: number; notStarted: number; avgProgress: number; }
export interface GoalRating { goalId: string; rating: number; comment: string; }
export interface ReviewData { _id: string; cycleId?: { name: string; startDate: string; endDate: string }; employeeId: { _id: string; name: string; email: string; department?: string }; managerId?: { name: string }; selfRating?: number; selfComments?: string; selfAchievements?: string; selfChallenges?: string; selfGoalRatings?: GoalRating[]; selfSubmittedAt?: string; managerRating?: number; managerComments?: string; managerGoalRatings?: GoalRating[]; managerSubmittedAt?: string; finalRating?: number; status: string; createdAt: string; }
export interface FeedbackData { _id: string; fromUser?: { name: string }; toUser: string; type: string; rating?: number; strengths?: string; improvements?: string; comments?: string; anonymous: boolean; createdAt: string; }
export interface PIPGoal { title: string; targetDate: string; status: string; managerComment?: string; }
export interface PIPData { _id: string; employeeId: { _id: string; name: string; email: string; department?: string }; managerId: { name: string }; reason: string; startDate: string; endDate: string; goals: PIPGoal[]; status: string; managerNotes?: string; createdAt: string; }
export interface CycleData { _id: string; name: string; startDate: string; endDate: string; selfDeadline?: string; managerDeadline?: string; isActive: boolean; createdAt: string; }

export const performanceApi = {
  // Goals
  getGoals: (params?: Record<string, string>) => api.get<ApiResponse<GoalData[]>>("/performance/goals", { params }),
  getGoalStats: (params?: Record<string, string | number>) => api.get<ApiResponse<GoalStats>>("/performance/goals/stats", { params }),
  getTeamGoals: (params?: Record<string, string | number>) => api.get<ApiResponse<GoalData[]>>("/performance/goals/team", { params }),
  createGoal: (data: Record<string, unknown>) => api.post<ApiResponse<GoalData>>("/performance/goals", data),
  updateGoal: (id: string, data: Record<string, unknown>) => api.put<ApiResponse<GoalData>>(`/performance/goals/${id}`, data),
  deleteGoal: (id: string) => api.delete<ApiResponse>(`/performance/goals/${id}`),
  addCheckIn: (id: string, data: { progress: number; note?: string }) => api.post<ApiResponse<GoalData>>(`/performance/goals/${id}/check-in`, data),
  toggleMilestone: (goalId: string, milestoneId: string) => api.put<ApiResponse<GoalData>>(`/performance/goals/${goalId}/milestones/${milestoneId}/toggle`),

  // Reviews
  getMyReviews: () => api.get<ApiResponse<ReviewData[]>>("/performance/reviews/my"),
  getTeamReviews: () => api.get<ApiResponse<ReviewData[]>>("/performance/reviews/team"),
  getReview: (id: string) => api.get<ApiResponse<ReviewData>>(`/performance/reviews/${id}`),
  submitSelfReview: (id: string, data: Record<string, unknown>) => api.post<ApiResponse<ReviewData>>(`/performance/reviews/${id}/self`, data),
  submitManagerReview: (id: string, data: Record<string, unknown>) => api.post<ApiResponse<ReviewData>>(`/performance/reviews/${id}/manager`, data),

  // Feedback
  giveFeedback: (data: Record<string, unknown>) => api.post<ApiResponse<FeedbackData>>("/performance/feedback", data),
  getMyFeedback: () => api.get<ApiResponse<FeedbackData[]>>("/performance/feedback/my"),
  getFeedbackFor: (userId: string) => api.get<ApiResponse<FeedbackData[]>>(`/performance/feedback/${userId}`),

  // PIP
  getPIP: (id: string) => api.get<ApiResponse<PIPData>>(`/performance/pip/${id}`),
  getAllPIPs: () => api.get<ApiResponse<PIPData[]>>("/performance/pip"),
  createPIP: (data: Record<string, unknown>) => api.post<ApiResponse<PIPData>>("/performance/pip", data),
  updatePIP: (id: string, data: Record<string, unknown>) => api.put<ApiResponse<PIPData>>(`/performance/pip/${id}`, data),

  // Cycles
  getCycles: () => api.get<ApiResponse<CycleData[]>>("/performance/cycles"),
  createCycle: (data: Record<string, unknown>) => api.post<ApiResponse<CycleData>>("/performance/cycles", data),
  updateCycle: (id: string, data: Record<string, unknown>) => api.put<ApiResponse<CycleData>>(`/performance/cycles/${id}`, data),

  // Calibration
  getCalibrationData: () => api.get<ApiResponse<ReviewData[]>>("/performance/calibrate"),
  calibrate: (reviewId: string, finalRating: number) => api.post<ApiResponse>("/performance/calibrate", { reviewId, finalRating }),
};
