"use client";

import { useCallback, useState } from "react";
import { usePaginatedData } from "@/hooks/shared/usePaginatedData";
import { useCrudManagement } from "@/hooks/shared/useCrudManagement";
import { queryKeys } from "@/lib/query-keys";
import { semesterService } from "@/services/events";
import type { SemesterFilters, SemesterPayload, SemesterType } from "@/types/events";

function parseSemester(form: FormData): SemesterPayload {
  return {
    year: Number(form.get("year")),
    type: String(form.get("type")) as SemesterType,
    startDate: String(form.get("startDate")),
    endDate: String(form.get("endDate")),
  };
}

export function useSemesterManagement() {
  const [filters, setFilters] = useState<SemesterFilters>({});
  const fetcher = useCallback(
    (page: number, limit: number) => semesterService.list(page, limit, filters),
    [filters],
  );
  const list = usePaginatedData(queryKeys.semesters.list(filters), fetcher, 20, {
    refetchOnMount: true,
  });
  const { setPage } = list;
  const crud = useCrudManagement({
    service: semesterService,
    parse: parseSemester,
    queryKey: queryKeys.semesters.all,
    relatedKeys: [queryKeys.events.all, queryKeys.eventOptions.semesters],
    onChanged: (action) => {
      if (
        action === "delete" &&
        list.items.length === 1 &&
        !list.pagination.hasNextPage &&
        list.page > 1
      ) {
        setPage(list.page - 1);
      }
    },
  });
  return {
    ...list,
    ...crud,
    filters,
    applyFilters: (next: SemesterFilters) => {
      setPage(1);
      setFilters(next);
    },
    clearFilters: () => {
      setPage(1);
      setFilters({});
    },
  };
}
