import api from "./axios";
import type { ApiResponse, Timer } from "../types";

export const timerApi = {
  start: (data: { projectId: string; description: string }) =>
    api.post<ApiResponse<Timer>>("/timers/start", data),

  stop: (id: string) =>
    api.patch<ApiResponse<Timer>>(`/timers/${id}/stop`),

  getRunning: () =>
    api.get<ApiResponse<Timer | null>>("/timers/running"),

  getHistory: () =>
    api.get<ApiResponse<Timer[]>>("/timers/history"),
};
