"use client";

import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePaginatedData } from "@/hooks/usePaginatedData";
import { useCrudManagement } from "@/hooks/useCrudManagement";
import { queryKeys } from "@/lib/query-keys";
import { criteriaPayload } from "@/lib/event-form";
import { criteriaService } from "@/services/events";
import type { CriteriaFilters } from "@/types/events";

export function useCriteriaManagement() {
  const [filters, setFilters] = useState<CriteriaFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const search = useDebounce(searchTerm.trim(), 500);
  const fetcher = useCallback(
    (page: number, limit: number) => criteriaService.list(page, limit, filters),
    [filters],
  );
  const list = usePaginatedData(queryKeys.criteria.list(filters), fetcher, 20, {
    refetchOnMount: true,
  });
  const { setPage } = list;
  useEffect(() => {
    setPage(1);
    setFilters((current) => ({ ...current, search: search.length >= 3 ? search : undefined }));
  }, [search, setPage]);
  const crud = useCrudManagement({
    service: criteriaService,
    parse: criteriaPayload,
    queryKey: queryKeys.criteria.all,
    relatedKeys: [queryKeys.events.all, queryKeys.eventOptions.criteria],
    onChanged: (action) => {
      if (
        action === "delete" &&
        list.items.length === 1 &&
        !list.pagination.hasNextPage &&
        list.page > 1
      )
        setPage(list.page - 1);
    },
  });
  return {
    ...list,
    ...crud,
    filters,
    searchTerm,
    setSearchTerm,
    applyFilters: (next: CriteriaFilters) => {
      setPage(1);
      setFilters({ ...next, search: search.length >= 3 ? search : undefined });
    },
    clearFilters: () => {
      setPage(1);
      setFilters({});
      setSearchTerm("");
    },
  };
}
