import { authHttp } from "@/services/http";
import type { PaginationMeta } from "@/types/admin";

export type UserNotification = {
  id: string;
  type: "APPEAL_APPROVED" | "APPEAL_REJECTED" | "CONDUCT_SCORE_WARNING";
  title: string;
  message: string;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export const notificationService = {
  mine: (page = 1, limit = 20) =>
    authHttp<{
      ok: true;
      data: UserNotification[];
      unread: number;
      pagination: PaginationMeta;
    }>(`/api/v1/notifications/me?page=${page}&limit=${limit}`),
  markRead: (id: string) =>
    authHttp<{ ok: true; data: UserNotification }>(`/api/v1/notifications/me/${id}/read`, {
      method: "PATCH",
    }),
  markAllRead: () =>
    authHttp<{ ok: true; data: { updated: number } }>("/api/v1/notifications/me/read-all", {
      method: "PATCH",
    }),
};
