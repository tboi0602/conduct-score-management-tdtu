"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";

export function useAdminAccess() {
  const query = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: adminService.getCurrentUser,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
  });
  const permissions = query.data?.data.permissions ?? [];
  const can = (permission: string) =>
    permissions.some((item) => item.permission === "*" || item.permission === permission);
  return {
    can,
    profile: query.data?.data,
    isLoading: query.isPending,
    error: query.error,
    retry: query.refetch,
  };
}
