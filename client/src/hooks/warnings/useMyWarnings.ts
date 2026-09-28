"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { warningService } from "@/services/warnings";

export function useMyWarnings(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.warnings.mine,
    queryFn: warningService.mine,
    enabled,
    staleTime: 60_000,
  });
}
