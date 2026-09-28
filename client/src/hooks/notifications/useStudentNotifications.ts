"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { queryKeys } from "@/lib/query-keys";
import { notificationService, type UserNotification } from "@/services/notifications";

type NotificationPage = Awaited<ReturnType<typeof notificationService.mine>>;

export function useStudentNotifications() {
  const [page, setPage] = useState(1);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.notifications.mine(page),
    queryFn: () => notificationService.mine(page),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const updateAllPages = (
    update: (item: UserNotification) => UserNotification,
    unread: (current: NotificationPage) => number,
  ) => {
    client.setQueriesData<NotificationPage>({ queryKey: queryKeys.notifications.all }, (current) =>
      current
        ? {
            ...current,
            data: current.data.map(update),
            unread: unread(current),
          }
        : current,
    );
  };
  const read = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: ({ data }) =>
      updateAllPages(
        (item) => (item.id === data.id ? data : item),
        (current) => Math.max(0, current.unread - 1),
      ),
  });
  const readAll = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => {
      const readAt = new Date().toISOString();
      updateAllPages(
        (item) => (item.readAt ? item : { ...item, readAt }),
        () => 0,
      );
    },
  });
  return { page, setPage, query, read, readAll };
}
