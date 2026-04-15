import api from "./axios";
import type { ApiResponse } from "../types";

export interface CourseUser { _id: string; name: string; email: string; department?: string; }
export interface CourseData { _id: string; title: string; description?: string; category?: string; skill?: string; duration?: string; instructor?: string; thumbnail?: string; link?: string; isActive: boolean; createdBy?: { name: string }; enrolledUsers: string[]; completedUsers: string[]; createdAt: string; }
export interface CourseDetailData { _id: string; title: string; description?: string; category?: string; skill?: string; duration?: string; instructor?: string; thumbnail?: string; link?: string; isActive: boolean; createdBy?: { name: string }; enrolledUsers: CourseUser[]; completedUsers: CourseUser[]; createdAt: string; }
export interface CertData { _id: string; userId: string; courseId?: { title: string }; name: string; issuer?: string; completedDate?: string; certificatePath?: string; expiryDate?: string; createdAt: string; }
export interface TrainingData { _id: string; title: string; description?: string; conductedBy: { _id: string; name: string; email?: string }; date: string; duration?: string; materials: string[]; type: string; attendees: string[]; createdAt: string; }

export const learningApi = {
  getCourses: (params?: Record<string, string>) => api.get<ApiResponse<CourseData[]>>("/learning/courses", { params }),
  getCourseById: (id: string) => api.get<ApiResponse<CourseDetailData>>(`/learning/courses/${id}`),
  createCourse: (data: Record<string, unknown>) => api.post<ApiResponse<CourseData>>("/learning/courses", data),
  updateCourse: (id: string, data: Record<string, unknown>) => api.put<ApiResponse<CourseData>>(`/learning/courses/${id}`, data),
  deleteCourse: (id: string) => api.delete<ApiResponse>(`/learning/courses/${id}`),
  enrollCourse: (id: string) => api.post<ApiResponse>(`/learning/courses/${id}/enroll`),
  completeCourse: (id: string) => api.post<ApiResponse>(`/learning/courses/${id}/complete`),

  getMyCertifications: () => api.get<ApiResponse<CertData[]>>("/learning/certifications"),
  addCertification: (data: Record<string, unknown>) => api.post<ApiResponse<CertData>>("/learning/certifications", data),

  getTrainings: () => api.get<ApiResponse<TrainingData[]>>("/learning/trainings"),
  createTraining: (data: Record<string, unknown>) => api.post<ApiResponse<TrainingData>>("/learning/trainings", data),
  getCalendar: () => api.get<ApiResponse<TrainingData[]>>("/learning/calendar"),
};
