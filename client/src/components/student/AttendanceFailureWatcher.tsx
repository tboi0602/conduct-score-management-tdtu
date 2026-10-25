"use client";

import { useCallback, useEffect } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { studentEventMessages } from "@/i18n/student-event-messages";
import {
  attendanceFailureStore,
  failureCategoryForRejection,
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
        if (now <= eventEnd && draft.status === "UNSENT" && draft.retryPayload) {
          const retryExpiry = draft.retryExpiresAt ? new Date(draft.retryExpiresAt).getTime() : 0;
          if (navigator.onLine && now <= retryExpiry) {
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
        if (now <= eventEnd || (draft.status === "FAILED" && draft.notifiedAt)) continue;

        const reconciledDraft =
          draft.retryPayload || draft.retryExpiresAt
            ? { ...draft, retryExpiresAt: undefined, retryPayload: undefined }
            : draft;
        if (reconciledDraft !== draft) await attendanceFailureStore.put(reconciledDraft);

        const response = await attendanceService.myAttempt(reconciledDraft.clientAttemptId);
        const request =
          response.data.request ??
          (reconciledDraft.requestId
            ? await attendanceService
                .myRequest(reconciledDraft.requestId)
                .then((result) => result.data)
                .catch(() => null)
            : null);
        if (request?.status === "ACCEPTED") {
          await attendanceFailureStore.remove(reconciledDraft.clientAttemptId);
          continue;
        }
        if (request?.status === "PENDING") continue;
        const notifiedAt = reconciledDraft.notifiedAt ?? new Date().toISOString();
        await attendanceFailureStore.put({
          ...reconciledDraft,
          requestId: request?.id ?? reconciledDraft.requestId,
          failureCategory: request
            ? failureCategoryForRejection(request.rejectionReason)
            : reconciledDraft.failureCategory,
          status: "FAILED",
          notifiedAt,
          retryExpiresAt: undefined,
          retryPayload: undefined,
        });
        if (!reconciledDraft.notifiedAt) {
          showToast(t.attendanceNotRecorded.replace("{event}", reconciledDraft.eventName), "error");
        }
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
