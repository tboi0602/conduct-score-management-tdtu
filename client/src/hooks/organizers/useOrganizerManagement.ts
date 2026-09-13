"use client";

import { useCallback, useEffect, useState } from "react";
import { useCrudManagement } from "@/hooks/shared/useCrudManagement";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { usePaginatedData } from "@/hooks/shared/usePaginatedData";
import { queryKeys } from "@/lib/query-keys";
import { organizerService } from "@/services/events";
import type { OrganizerFilters, OrganizerPayload } from "@/types/events";

function payload(form: FormData): OrganizerPayload {
  const code = String(form.get("code") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  if (!code || !name) throw new Error("Mã và tên đơn vị là bắt buộc");
  return { code, name, facultyId: String(form.get("facultyId") ?? "") || null };
}

export function useOrganizerManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const search = useDebounce(searchTerm.trim(), 500);
  const filters: OrganizerFilters = { search: search.length >= 3 ? search : undefined };
  const fetcher = useCallback(
    (page: number, limit: number) => organizerService.list(page, limit, filters),
    [filters.search],
  );
  const list = usePaginatedData(queryKeys.organizers.list(filters), fetcher, 20, {
    refetchOnMount: true,
  });
  const { setPage } = list;
  useEffect(() => setPage(1), [search, setPage]);
  const crud = useCrudManagement({
    service: organizerService,
    parse: payload,
    queryKey: queryKeys.organizers.all,
    relatedKeys: [queryKeys.events.all],
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
  return { ...list, ...crud, searchTerm, setSearchTerm };
}
