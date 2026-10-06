"use client";

import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { queryKeys } from "@/lib/query-keys";
import { eventService } from "@/services/events";
import type { Criteria, Semester } from "@/types/events";
import type { OrganizingUnit } from "@/types/events";
import type { PaginatedResponse } from "@/types/admin";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";

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

export function useEventOrganizerOptions(
  selected: OrganizingUnit | null,
  onChange: (unit: OrganizingUnit | null) => void,
  facultyId?: string,
) {
  const [search, setSearch] = useState("");
  const term = useDebounce(search.trim(), 500);
  const { profile } = useAdminAccess();
  const query = useQuery({
    queryKey: queryKeys.eventOptions.organizerPage(1, term, facultyId),
    queryFn: () => eventService.organizers(1, term || undefined, facultyId),
    staleTime: 5 * 60_000,
  });
  const items = query.data?.data ?? [];

  useEffect(() => {
    if (selected) return;
    const targetFacultyId = facultyId || profile?.effectiveFaculty?.id;
    if (targetFacultyId) {
      const facultyUnit = items.find(
        (item) => item.type === "FACULTY" && item.facultyId === targetFacultyId,
      );
      if (facultyUnit) {
        onChange(facultyUnit);
        return;
      }
    }
    if (!facultyId && items.length === 1) {
      onChange(items[0]);
    }
  }, [items, onChange, profile?.effectiveFaculty?.id, selected, facultyId]);

  return { search, setSearch, query, items };
}
