"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useBarcodeScanner } from "@/hooks/attendance/useBarcodeScanner";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { attendanceMessages } from "@/i18n/attendance-messages";
import { env } from "@/lib/env";
import { queryKeys } from "@/lib/query-keys";
import { attendanceService } from "@/services/attendance";
import { eventService } from "@/services/events";
import type { AttendanceDirection } from "@/types/attendance";

type AttendanceResult = "ATTENDED" | "LATE" | "ABSENT";

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is unavailable"));
      return;
    }

    let best: GeolocationPosition | null = null;
    let watchId = 0;
    const finish = () => {
      navigator.geolocation.clearWatch(watchId);
      if (best) resolve(best);
      else reject(new Error("Unable to obtain device location"));
    };
    const timer = window.setTimeout(finish, 20_000);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!best || position.coords.accuracy < best.coords.accuracy) best = position;
        if (position.coords.accuracy <= 100) {
          window.clearTimeout(timer);
          finish();
        }
      },
      (error) => {
        window.clearTimeout(timer);
        navigator.geolocation.clearWatch(watchId);
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 10_000 },
    );
  });
}

export function useAttendanceWorkspace(eventId: string) {
  const { locale } = useAdminTranslations();
  const messages = attendanceMessages[locale];
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<AttendanceDirection>("CHECK_IN");
  const [attendanceStatus, setAttendanceStatus] = useState<"ATTENDED" | "LATE">("ATTENDED");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [recordStatuses, setRecordStatuses] = useState<Record<string, AttendanceResult>>({});
  const [page, setPage] = useState(1);
  const [qrImage, setQrImage] = useState("");
  const [clock, setClock] = useState(Date.now());
  const search = useDebounce(searchTerm.trim(), 500);

  const eventQuery = useQuery({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => eventService.get(eventId).then((response) => response.data),
  });
  const sessionQuery = useQuery({
    queryKey: queryKeys.attendance.session(eventId),
    queryFn: () => attendanceService.activeSession(eventId).then((response) => response.data),
    refetchInterval: 15_000,
  });
  const qrQuery = useQuery({
    queryKey: queryKeys.attendance.qr(eventId),
    queryFn: () => attendanceService.qr(eventId).then((response) => response.data),
    enabled: Boolean(sessionQuery.data),
    refetchInterval: 15_000,
  });
  const requestsQuery = useQuery({
    queryKey: [...queryKeys.attendance.requests(eventId, search, filterStatus), page],
    queryFn: () => attendanceService.requests(eventId, page, search, filterStatus),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!qrQuery.data?.scanUrl) {
      setQrImage("");
      return;
    }
    void QRCode.toDataURL(qrQuery.data.scanUrl, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
    }).then(setQrImage);
  }, [qrQuery.data?.scanUrl]);

  useEffect(() => {
    let source: EventSource | null = null;
    void attendanceService
      .eventTicket(eventId)
      .then(({ data }) => {
        source = new EventSource(
          `${env.apiBaseUrl}/api/v1/attendance/stream?ticket=${encodeURIComponent(data.ticket)}`,
        );
        source.addEventListener("message", () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.attendance.requests(eventId, search, filterStatus),
          });
        });
      })
      .catch(() => undefined);
    return () => source?.close();
  }, [eventId, filterStatus, queryClient, search]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const open = useMutation({
    mutationFn: async () => {
      const position = await getCurrentPosition();
      return attendanceService.openSession(eventId, {
        direction,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.attendance.session(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.attendance.qr(eventId) });
    },
    onError: (error) => {
      const isLocationError =
        typeof error === "object" && error !== null && "code" in error && "message" in error;
      showToast(isLocationError ? messages.locationError : messages.actionError, "error");
    },
  });
  const close = useMutation({
    mutationFn: () => attendanceService.closeSession(eventId),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.attendance.session(eventId), null);
      queryClient.removeQueries({ queryKey: queryKeys.attendance.qr(eventId) });
    },
    onError: () => showToast(messages.actionError, "error"),
  });
  const scan = useMutation({
    mutationFn: ({ source, code }: { source: "STAFF_BARCODE" | "MANUAL_ENTRY"; code: string }) =>
      attendanceService.scanManaged(eventId, {
        studentCode: code,
        direction,
        source,
        status: attendanceStatus,
      }),
    onSuccess: () => showToast(messages.scanSuccess),
    onError: () => showToast(messages.actionError, "error"),
  });
  const submitBarcode = useCallback(
    (code: string, source: "STAFF_BARCODE" | "MANUAL_ENTRY") => scan.mutateAsync({ source, code }),
    [scan],
  );
  const barcode = useBarcodeScanner({ disabled: scan.isPending, onSubmit: submitBarcode });
  const adjust = useMutation({
    mutationFn: ({ recordId, status }: { recordId: string; status: AttendanceResult }) =>
      attendanceService.adjustStatus(eventId, recordId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.requests(eventId, search, filterStatus),
      });
      showToast(messages.adjusted);
    },
    onError: () => showToast(messages.actionError, "error"),
  });

  const updateSearchTerm = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };
  const updateFilterStatus = (value: string) => {
    setFilterStatus(value);
    setPage(1);
  };
  const updateRecordStatus = (recordId: string, status: AttendanceResult) => {
    setRecordStatuses((current) => ({ ...current, [recordId]: status }));
  };
  const qrSecondsRemaining = qrQuery.data
    ? Math.max(0, Math.ceil((new Date(qrQuery.data.expiresAt).getTime() - clock) / 1_000))
    : null;

  return {
    eventQuery,
    sessionQuery,
    qrQuery,
    requestsQuery,
    direction,
    setDirection,
    attendanceStatus,
    setAttendanceStatus,
    searchTerm,
    updateSearchTerm,
    filterStatus,
    updateFilterStatus,
    recordStatuses,
    updateRecordStatus,
    page,
    setPage,
    qrImage,
    qrSecondsRemaining,
    open,
    close,
    scan,
    adjust,
    barcode,
  };
}
