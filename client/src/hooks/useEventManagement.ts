"use client";

import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePaginatedData } from "@/hooks/usePaginatedData";
import { useCrudManagement } from "@/hooks/useCrudManagement";
import { queryKeys } from "@/lib/query-keys";
import { eventPayload } from "@/lib/event-form";
import { eventService } from "@/services/events";
import type { EventFilters } from "@/types/events";

export function useEventManagement() {
  const [filters, setFilters] = useState<EventFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const search = useDebounce(searchTerm.trim(), 500);
  const fetcher = useCallback(
    (page: number, limit: number) => eventService.list(page, limit, filters),
    [filters],
  );
  const list = usePaginatedData(queryKeys.events.list(filters), fetcher, 20, {
    refetchOnMount: true,
  });
  const { setPage } = list;
  useEffect(() => {
    setPage(1);
    setFilters((current) => ({ ...current, search: search.length >= 3 ? search : undefined }));
  }, [search, setPage]);
  const crud = useCrudManagement({
    service: eventService,
    parse: eventPayload,
    queryKey: queryKeys.events.all,
    relatedKeys: [queryKeys.eventOptions.organizerPage(1)],
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
    applyFilters: (next: EventFilters) => {
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
