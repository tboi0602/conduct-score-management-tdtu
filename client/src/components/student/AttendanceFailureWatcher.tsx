"use client";

import { useCallback, useEffect } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { studentEventMessages } from "@/i18n/student-event-messages";
import {
  attendanceFailureStore,
  failureCategoryForRejection,
  incidentPayload,
  sha256,
} from "@/lib/attendance-failure-store";
import { getAuthSession } from "@/lib/auth-storage";
import { attendanceService } from "@/services/attendance";

export function AttendanceFailureWatcher() {
  const { locale } = useLanguage();
  const t = studentEventMessages[locale];
  const { showToast } = useToast();

  const reconcile = useCallback(async () => {
    const session = getAuthSession();
    if (!session) return;
    const drafts = await attendanceFailureStore.listForUser(session.user.id);
    const now = Date.now();
    await attendanceFailureStore.cleanup();

    for (const draft of drafts) {
      const eventEnd = new Date(draft.eventEnd).getTime();
      if (now > eventEnd + 7 * 24 * 60 * 60 * 1000) {
        await attendanceFailureStore.remove(draft.clientAttemptId);
        continue;
      }
      try {
        if (draft.syncedAt) continue;
        if (draft.status === "UNSENT" && draft.retryPayload) {
          const retryExpiry = draft.retryExpiresAt ? new Date(draft.retryExpiresAt).getTime() : 0;
          if (navigator.onLine && now <= retryExpiry && now <= eventEnd) {
            const response = await attendanceService.studentQr({
              ...draft.retryPayload,
              clientAttemptId: draft.clientAttemptId,
            });
            await attendanceFailureStore.put({
              ...draft,
              requestId: response.data.requestId,
              direction: response.data.direction,
              status: "PENDING",
            });
            continue;
          }
        }

        if (draft.status === "UNSENT" || draft.status === "FAILED") {
          const payload = incidentPayload(draft);
          const digest = await sha256(payload);
          if (navigator.onLine) {
            await attendanceService.submitIncident(payload, digest);
            const archived = {
              ...draft,
              retryPayload: undefined,
              digest,
              syncedAt: new Date().toISOString(),
              status: "FAILED" as const,
            };
            await attendanceFailureStore.putIncident(archived);
            await attendanceFailureStore.put(archived);
            if (!draft.notifiedAt) {
              showToast(t.attendanceNotRecorded.replace("{event}", draft.eventName), "error");
            }
          }
          continue;
        }

        const response = await attendanceService.myAttempt(draft.clientAttemptId);
        if (response.data.request?.status === "ACCEPTED") {
          await attendanceFailureStore.remove(draft.clientAttemptId);
          continue;
        }
        if (response.data.request?.status === "PENDING") continue;
        await attendanceFailureStore.put({
          ...draft,
          requestId: response.data.request?.id ?? draft.requestId,
          failureCategory: response.data.request
            ? failureCategoryForRejection(response.data.request.rejectionReason)
            : draft.failureCategory,
          status: "FAILED",
          notifiedAt: draft.notifiedAt,
        });
      } catch {
        // Keep the local draft and retry when connectivity returns.
      }
    }
  }, [showToast, t.attendanceNotRecorded]);

  useEffect(() => {
    void reconcile();
    const online = () => void reconcile();
    const timer = window.setInterval(() => void reconcile(), 30_000);
    window.addEventListener("online", online);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, [reconcile]);

  return null;
}
