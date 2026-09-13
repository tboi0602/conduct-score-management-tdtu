"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { eventService } from "@/services/events";

export function useAttendanceEvents() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [...queryKeys.attendance.events, page],
    queryFn: () => eventService.list(page, 12, { status: "ONGOING" }),
    staleTime: 15_000,
  });
  return { page, setPage, query };
}
