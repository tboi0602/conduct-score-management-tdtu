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
import { HttpError } from "@/services/http";

export type AttendanceRealtimeState = "CONNECTING" | "OPEN" | "FALLBACK";

const SSE_INVALIDATION_DEBOUNCE_MS = 300;
const FALLBACK_POLL_INTERVAL_MS = 15_000;
const SSE_RECONNECT_DELAYS_MS = [2_000, 4_000, 8_000, 16_000, 30_000] as const;

export function attendanceSseReconnectDelay(attempt: number, randomValue = Math.random()): number {
  const baseDelay =
    SSE_RECONNECT_DELAYS_MS[Math.min(Math.max(0, attempt), SSE_RECONNECT_DELAYS_MS.length - 1)];
  const jitterMultiplier = 0.8 + Math.min(1, Math.max(0, randomValue)) * 0.4;
  return Math.min(30_000, Math.round(baseDelay * jitterMultiplier));
}

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
  const [listDirection, setListDirection] = useState<"ALL" | AttendanceDirection>("ALL");
  const [attendanceStatus, setAttendanceStatus] = useState<"ATTENDED" | "LATE">("ATTENDED");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [qrImage, setQrImage] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [realtimeState, setRealtimeState] = useState<AttendanceRealtimeState>("CONNECTING");
  const debouncedSearch = useDebounce(searchTerm.trim(), 500);
  const search = debouncedSearch.length >= 3 ? debouncedSearch : "";

  const eventQuery = useQuery({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => eventService.get(eventId).then((response) => response.data),
  });
  const sessionQuery = useQuery({
    queryKey: queryKeys.attendance.session(eventId),
    queryFn: () => attendanceService.activeSession(eventId).then((response) => response.data),
    enabled: eventQuery.data?.deliveryMode === "OFFLINE",
    refetchInterval: 15_000,
  });
  const attendanceWindow = eventQuery.data
    ? clock < new Date(eventQuery.data.timeStart).getTime()
      ? "NOT_STARTED"
      : clock >= new Date(eventQuery.data.timeEnd).getTime()
        ? "ENDED"
        : "OPEN"
    : "OPEN";
  const qrQuery = useQuery({
    queryKey: queryKeys.attendance.qr(eventId),
    queryFn: () => attendanceService.qr(eventId).then((response) => response.data),
    enabled: Boolean(sessionQuery.data) && attendanceWindow === "OPEN",
    refetchInterval: 15_000,
  });
  const requestsQuery = useQuery({
    queryKey: [...queryKeys.attendance.requests(eventId, search, listDirection), page],
    queryFn: () =>
      attendanceService.requests(
        eventId,
        page,
        search,
        listDirection === "ALL" ? undefined : listDirection,
      ),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: realtimeState === "OPEN" ? false : FALLBACK_POLL_INTERVAL_MS,
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
    let retryTimer: number | null = null;
    let invalidationTimer: number | null = null;
    let reconnectAttempt = 0;
    let cancelled = false;

    const scheduleInvalidation = () => {
      if (invalidationTimer !== null) return;
      invalidationTimer = window.setTimeout(() => {
        invalidationTimer = null;
        void queryClient.invalidateQueries({
          queryKey: queryKeys.attendance.requestsAll(eventId),
        });
      }, SSE_INVALIDATION_DEBOUNCE_MS);
    };

    const scheduleReconnect = () => {
      setRealtimeState("FALLBACK");
      if (cancelled || retryTimer !== null) return;
      const delay = attendanceSseReconnectDelay(reconnectAttempt);
      reconnectAttempt += 1;
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (typeof window.EventSource === "undefined") {
        setRealtimeState("FALLBACK");
        return;
      }
      setRealtimeState((current) => (current === "OPEN" ? current : "CONNECTING"));
      try {
        const { data } = await attendanceService.eventTicket(eventId);
        if (cancelled) return;
        source = new window.EventSource(
          `${env.apiBaseUrl}/api/v1/attendance/stream?ticket=${encodeURIComponent(data.ticket)}`,
        );
        source.onopen = () => {
          reconnectAttempt = 0;
          setRealtimeState("OPEN");
        };
        source.addEventListener("message", scheduleInvalidation);
        source.onerror = () => {
          source?.close();
          source = null;
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    };

    void connect();
    return () => {
      cancelled = true;
      source?.close();
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      if (invalidationTimer !== null) window.clearTimeout(invalidationTimer);
    };
  }, [eventId, queryClient]);

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
    onSuccess: () => {
      showToast(messages.scanSuccess);
      if (realtimeState !== "OPEN") {
        window.setTimeout(() => void requestsQuery.refetch(), 1_000);
      }
    },
    onError: (error) =>
      showToast(
        error instanceof HttpError && error.code === "ATTENDANCE_ALREADY_RECORDED"
          ? messages.alreadyAttended
          : messages.actionError,
        "error",
      ),
  });
  const submitBarcode = useCallback(
    (code: string, source: "STAFF_BARCODE" | "MANUAL_ENTRY") => scan.mutateAsync({ source, code }),
    [scan],
  );
  const barcode = useBarcodeScanner({ disabled: scan.isPending, onSubmit: submitBarcode });

  const updateSearchTerm = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };
  const updateListDirection = (value: "ALL" | AttendanceDirection) => {
    setListDirection(value);
    setPage(1);
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
    listDirection,
    updateListDirection,
    attendanceStatus,
    setAttendanceStatus,
    searchTerm,
    updateSearchTerm,
    page,
    setPage,
    qrImage,
    qrSecondsRemaining,
    open,
    close,
    scan,
    barcode,
    attendanceWindow,
    realtimeState,
  };
}
