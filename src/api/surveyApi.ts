import api from "./axios";
import type { ApiResponse } from "../types";

export interface SurveyQuestion { text: string; type: "mcq" | "rating" | "text"; options?: string[]; required?: boolean; }
export interface SurveyResponse { userId?: string; anonymous: boolean; answers: { questionIndex: number; value: unknown }[]; submittedAt: string; }
export interface SurveyData {
  _id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  responses?: SurveyResponse[];
  createdBy: { name: string };
  isActive: boolean;
  deadline?: string;
  responded?: boolean;
  createdAt: string;
}

export const surveyApi = {
  getAll: () => api.get<ApiResponse<SurveyData[]>>("/surveys"),
  getById: (id: string) => api.get<ApiResponse<SurveyData>>(`/surveys/${id}`),
  create: (data: Record<string, unknown>) => api.post<ApiResponse<SurveyData>>("/surveys", data),
  submit: (id: string, data: { answers: { questionIndex: number; value: unknown }[]; anonymous?: boolean }) => api.post<ApiResponse>(`/surveys/${id}/submit`, data),
  getResults: (id: string) => api.get<ApiResponse<SurveyData>>(`/surveys/${id}/results`),
  delete: (id: string) => api.delete<ApiResponse>(`/surveys/${id}`),
};
