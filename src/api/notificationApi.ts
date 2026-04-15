import api from "./axios";

export interface Notification {
  _id: string;
  recipient: string;
  sender?: { _id: string; name: string; email: string } | null;
  type:
    | "announcement"
    | "leave"
    | "timesheet"
    | "wfh"
    | "compoff"
    | "recognition"
    | "chat"
    | "document"
    | "system";
  title: string;
  message: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  success: boolean;
  data: Notification[];
  unread: number;
  pagination: { total: number; page: number; limit: number; pages: number };
}

export const notificationApi = {
  list: (params: { page?: number; limit?: number; unread?: boolean } = {}) =>
    api.get<NotificationListResponse>("/notifications", { params }).then((r) => r.data),

  unreadCount: () =>
    api.get<{ success: boolean; data: { count: number } }>("/notifications/unread-count").then((r) => r.data.data.count),

  markRead: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () => api.patch("/notifications/read-all").then((r) => r.data),

  remove: (id: string) => api.delete(`/notifications/${id}`).then((r) => r.data),
};
