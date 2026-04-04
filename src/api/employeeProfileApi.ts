import api from "./axios";
import type { ApiResponse, EmployeeProfile } from "../types";

export const employeeProfileApi = {
  getMyProfile: () =>
    api.get<ApiResponse<EmployeeProfile>>("/employee-profile/me"),

  updateMyProfile: (data: Partial<EmployeeProfile>) =>
    api.put<ApiResponse<EmployeeProfile>>("/employee-profile/me", data),

  uploadPhoto: (formData: FormData) =>
    api.post<ApiResponse<EmployeeProfile>>("/employee-profile/me/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  uploadOfferLetter: (formData: FormData) =>
    api.post<ApiResponse<EmployeeProfile>>("/employee-profile/me/offer-letter", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  uploadCertificates: (formData: FormData) =>
    api.post<ApiResponse<EmployeeProfile>>("/employee-profile/me/certificates", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  getByUserId: (id: string) =>
    api.get<ApiResponse<EmployeeProfile>>(`/employee-profile/${id}`),
};
