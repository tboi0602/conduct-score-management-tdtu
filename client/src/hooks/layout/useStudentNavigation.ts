"use client";

import { useQuery } from "@tanstack/react-query";
import { appealService } from "@/services/appeals";
import { notificationService } from "@/services/notifications";
import { queryKeys } from "@/lib/query-keys";

export function useStudentNavigation(canReadAppeals: boolean, canReadNotifications: boolean) {
  const notifications = useQuery({
    queryKey: queryKeys.notifications.mine(1),
    queryFn: () => notificationService.mine(1),
    enabled: canReadNotifications,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const appeals = useQuery({
    queryKey: queryKeys.appeals.mine,
    queryFn: appealService.mine,
    enabled: canReadAppeals,
    staleTime: 30_000,
  });
  return {
    unreadNotifications: notifications.data?.unread ?? 0,
    pendingAppeals: (appeals.data?.data ?? []).filter((item) => item.status === "PENDING").length,
  };
}
