import api from "./axios";
import type { ApiResponse, Holiday } from "../types";

export const holidayApi = {
  getAll: (year?: number) =>
    api.get<ApiResponse<Holiday[]>>("/holidays", { params: year ? { year } : {} }),

  create: (data: { name: string; date: string; type?: string; description?: string }) =>
    api.post<ApiResponse<Holiday>>("/holidays", data),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/holidays/${id}`),
};
