"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { attendanceService } from "@/services/attendance";
import { semesterService } from "@/services/events";

export function useDashboardData(enabled: boolean) {
  const [semesterId, setSemesterId] = useState("");
  const semesters = useQuery({
    queryKey: queryKeys.semesters.list({}),
    queryFn: () => semesterService.list(1, 100),
    enabled,
    staleTime: 10 * 60_000,
  });
  useEffect(() => {
    if (!semesterId && semesters.data?.data[0]) setSemesterId(semesters.data.data[0].id);
  }, [semesterId, semesters.data]);
  const dashboard = useQuery({
    queryKey: queryKeys.dashboard(semesterId),
    queryFn: () => attendanceService.dashboard(semesterId).then((response) => response.data),
    enabled: enabled && Boolean(semesterId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  return { semesterId, setSemesterId, semesters, dashboard };
}
