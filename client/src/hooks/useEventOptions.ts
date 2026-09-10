"use client";

import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { queryKeys } from "@/lib/query-keys";
import { eventService } from "@/services/events";
import type { Criteria, Semester } from "@/types/events";
import type { PaginatedResponse } from "@/types/admin";

export type EventReference = Pick<Criteria, "id" | "title" | "maxPoints"> | Semester;

export function useEventOptions(kind: "criteria" | "semesters") {
  const [search, setSearch] = useState("");
  const term = useDebounce(search.trim(), 500);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [term]);
  const invalidYear =
    kind === "semesters" && term !== "" && (!/^\d+$/.test(term) || Number(term) > 2147483647);
  const filter = kind === "criteria" ? (term.length >= 3 ? term : undefined) : term || undefined;
  const query = useQuery({
    queryKey:
      kind === "criteria"
        ? queryKeys.eventOptions.criteriaPage(page, filter)
        : queryKeys.eventOptions.semesterPage(page, filter),
    queryFn: (): Promise<PaginatedResponse<EventReference>> =>
      kind === "criteria"
        ? eventService.criteria(page, filter)
        : eventService.semesters(page, filter),
    enabled: !invalidYear,
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: true,
  });
  return { ...query, search, setSearch, page, setPage, invalidYear };
}
