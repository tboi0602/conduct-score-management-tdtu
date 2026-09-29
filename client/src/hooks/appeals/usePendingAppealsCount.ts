import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { appealService } from "@/services/appeals";

export function usePendingAppealsCount(enabled: boolean): number | undefined {
  const query = useQuery({
    queryKey: queryKeys.appeals.pending,
    queryFn: () => appealService.list("PENDING"),
    enabled,
    staleTime: 30_000,
  });
  return query.data?.pagination.total;
}
