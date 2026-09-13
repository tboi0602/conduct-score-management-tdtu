"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";

export function useAcademicOptions() {
  return useQuery({
    queryKey: queryKeys.academic.options,
    queryFn: adminService.getAcademicOptions,
    staleTime: 60 * 60_000,
  });
}
