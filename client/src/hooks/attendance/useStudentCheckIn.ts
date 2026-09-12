"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { attendanceMessages } from "@/i18n/attendance-messages";
import { env } from "@/lib/env";
import { queryKeys } from "@/lib/query-keys";
import { attendanceService } from "@/services/attendance";

function locate() {
  return new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0,
    }),
  );
}

export function useStudentCheckIn(token: string) {
  const { locale } = useLanguage();
  const { showToast } = useToast();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const position = await locate();
      return attendanceService.studentQr({
        token,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      });
    },
    onError: () => showToast(attendanceMessages[locale].actionError, "error"),
  });
  const requestId = mutation.data?.data.requestId ?? "";
  const request = useQuery({
    queryKey: queryKeys.attendance.request(requestId),
    queryFn: () => attendanceService.myRequest(requestId).then((response) => response.data),
    enabled: Boolean(requestId),
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 1_500 : false),
  });

  useEffect(() => {
    if (!requestId) return;
    let source: EventSource | null = null;
    void attendanceService
      .studentTicket()
      .then(({ data }) => {
        source = new EventSource(
          `${env.apiBaseUrl}/api/v1/attendance/stream?ticket=${encodeURIComponent(data.ticket)}`,
        );
        source.addEventListener("message", () => {
          void client.invalidateQueries({ queryKey: queryKeys.attendance.request(requestId) });
        });
      })
      .catch(() => undefined);
    return () => source?.close();
  }, [client, requestId]);

  return { mutation, request, status: request.data?.status };
}
