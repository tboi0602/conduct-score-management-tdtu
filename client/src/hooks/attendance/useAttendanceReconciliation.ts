"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { queryKeys } from "@/lib/query-keys";
import { attendanceService } from "@/services/attendance";
import type { AttendanceReconciliationState } from "@/types/attendance";

export function useAttendanceReconciliation(eventId: string) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [state, setState] = useState<AttendanceReconciliationState | "">("");
  const search = useDebounce(searchTerm.trim(), 500);
  const queryKey = queryKeys.attendance.reconciliation(eventId, search, state, page);
  const query = useQuery({
    queryKey,
    queryFn: () => attendanceService.reconciliation(eventId, page, search, state),
    placeholderData: keepPreviousData,
  });
  const resolve = useMutation({
    mutationFn: ({ incidentId, note }: { incidentId: string; note: string }) =>
      attendanceService.resolveIncident(eventId, incidentId, note),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["admin", "attendance", eventId, "reconciliation"],
      }),
  });
  return {
    query,
    resolve,
    page,
    setPage,
    searchTerm,
    setSearchTerm: (value: string) => {
      setSearchTerm(value);
      setPage(1);
    },
    state,
    setState: (value: AttendanceReconciliationState | "") => {
      setState(value);
      setPage(1);
    },
  };
}
