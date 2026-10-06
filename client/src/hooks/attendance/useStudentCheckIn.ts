"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { attendanceMessages } from "@/i18n/attendance-messages";
import {
  attendanceFailureStore,
  failureCategoryForRejection,
  incidentPayload,
  qrRetryExpiry,
  sha256,
  tokenFingerprint,
} from "@/lib/attendance-failure-store";
import { getAuthSession } from "@/lib/auth-storage";
import { env } from "@/lib/env";
import { queryKeys } from "@/lib/query-keys";
import { attendanceService } from "@/services/attendance";
import { HttpError } from "@/services/http";
import type { AttendanceFailureCategory, AttendanceFailureDraft } from "@/types/attendance-failure";

function locate() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 1, message: "Geolocation is unavailable on this device" });
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0,
    });
  });
}

export type StudentCheckInContext = {
  eventId: string;
  eventName: string;
  eventEnd: string;
  eventStart: string;
  direction: "CHECK_IN" | "CHECK_OUT" | null;
};

function failureCategory(error: unknown): AttendanceFailureCategory {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
  ) {
    return error.code === 3 ? "TIMEOUT" : "LOCATION_ERROR";
  }
  if (error instanceof HttpError) {
    if (error.status === 503) return "SERVICE_ERROR";
    if (error.message.toLowerCase().includes("session")) return "SESSION_EXPIRED";
    if (error.message.toLowerCase().includes("qr")) return "QR_ERROR";
    if (error.message.toLowerCase().includes("location")) return "LOCATION_ERROR";
  }
  if (error instanceof TypeError || !navigator.onLine) return "NETWORK_ERROR";
  return "OTHER";
}

export function useStudentCheckIn(token: string, context: StudentCheckInContext) {
  const { locale } = useLanguage();
  const { showToast } = useToast();
  const client = useQueryClient();
  const attemptId = useRef(crypto.randomUUID());
  const localDraft = useRef<AttendanceFailureDraft | null>(null);
  const session = getAuthSession();
  const mutation = useMutation({
    mutationFn: async () => {
      if (context.eventStart && Date.now() < new Date(context.eventStart).getTime()) {
        throw new HttpError(409, "Attendance has not opened yet");
      }
      if (context.eventEnd && Date.now() >= new Date(context.eventEnd).getTime()) {
        throw new HttpError(409, "Attendance has ended");
      }
      let position: GeolocationPosition | null = null;
      try {
        position = await locate();
        const response = await attendanceService.studentQr({
          token,
          clientAttemptId: attemptId.current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
        if (session && response.data.event) {
          const draft: AttendanceFailureDraft = {
            clientAttemptId: attemptId.current,
            userId: session.user.id,
            eventId: response.data.event.id,
            eventName: response.data.event.name,
            eventEnd: response.data.event.timeEnd,
            direction: response.data.direction,
            failedAt: new Date().toISOString(),
            requestId: response.data.requestId,
            failureCategory: "OTHER",
            status: "PENDING",
          };
          localDraft.current = draft;
          await attendanceFailureStore.put(draft);
        }
        return response;
      } catch (error) {
        if (session && context.eventId && context.eventEnd) {
          const draft: AttendanceFailureDraft = {
            clientAttemptId: attemptId.current,
            userId: session.user.id,
            eventId: context.eventId,
            eventName: context.eventName || context.eventId,
            eventEnd: context.eventEnd,
            direction: context.direction,
            failedAt: new Date().toISOString(),
            requestId: null,
            failureCategory: failureCategory(error),
            status: "UNSENT",
            retryExpiresAt: qrRetryExpiry(token),
            retryPayload: position
              ? {
                  token,
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracyMeters: position.coords.accuracy,
                }
              : undefined,
            tokenFingerprint: token ? await tokenFingerprint(token) : null,
          };
          draft.digest = await sha256(incidentPayload(draft));
          localDraft.current = draft;
          await attendanceFailureStore.put(draft);
        }
        throw error;
      }
    },
    onError: (error) => {
      const isLocationError = typeof error === "object" && error !== null && "code" in error;
      showToast(
        isLocationError
          ? attendanceMessages[locale].locationError
          : attendanceMessages[locale].actionError,
        "error",
      );
    },
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

  useEffect(() => {
    if (!session || !request.data) return;
    if (request.data.status === "ACCEPTED") {
      void attendanceFailureStore.remove(attemptId.current);
      return;
    }
    if (request.data.status === "REJECTED" && context.eventId && context.eventEnd) {
      const existing = localDraft.current;
      const draft: AttendanceFailureDraft = {
        ...existing,
        clientAttemptId: attemptId.current,
        userId: session.user.id,
        eventId: context.eventId,
        eventName: context.eventName || context.eventId,
        eventEnd: context.eventEnd,
        direction: context.direction,
        failedAt: new Date().toISOString(),
        requestId,
        failureCategory: failureCategoryForRejection(request.data.rejectionReason),
        status: "FAILED",
      };
      void (async () => {
        draft.digest = await sha256(incidentPayload(draft));
        localDraft.current = draft;
        await attendanceFailureStore.put(draft);
      })();
    }
  }, [
    context.direction,
    context.eventEnd,
    context.eventId,
    context.eventName,
    request.data,
    requestId,
    session,
  ]);

  return { mutation, request, status: request.data?.status };
}
