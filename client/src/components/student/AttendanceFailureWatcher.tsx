"use client";

import { useCallback, useEffect } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import {
  attendanceFailureStore,
  failureCategoryForRejection,
} from "@/lib/attendance-failure-store";
import { getAuthSession } from "@/lib/auth-storage";
import { attendanceService } from "@/services/attendance";

export function AttendanceFailureWatcher() {
  const { locale } = useLanguage();
  const { showToast } = useToast();

  const reconcile = useCallback(async () => {
    const session = getAuthSession();
    if (!session) return;
    const drafts = await attendanceFailureStore.listForUser(session.user.id);
    const now = Date.now();

    for (const draft of drafts) {
      const eventEnd = new Date(draft.eventEnd).getTime();
      if (!Number.isFinite(eventEnd) || now <= eventEnd) continue;
      if (now > eventEnd + 7 * 24 * 60 * 60 * 1000) {
        await attendanceFailureStore.remove(draft.clientAttemptId);
        continue;
      }
      try {
        const response = await attendanceService.myAttempt(draft.clientAttemptId);
        if (response.data.request?.status === "ACCEPTED") {
          await attendanceFailureStore.remove(draft.clientAttemptId);
          continue;
        }
        if (response.data.request?.status === "PENDING") continue;
        if (!draft.notifiedAt) {
          showToast(
            locale === "vi"
              ? `Điểm danh sự kiện “${draft.eventName}” chưa được ghi nhận. Bạn có thể kiểm tra và gửi khiếu nại.`
              : `Attendance for “${draft.eventName}” was not recorded. You can review it and submit an appeal.`,
            "error",
          );
        }
        await attendanceFailureStore.put({
          ...draft,
          requestId: response.data.request?.id ?? draft.requestId,
          failureCategory: response.data.request
            ? failureCategoryForRejection(response.data.request.rejectionReason)
            : draft.failureCategory,
          status: "FAILED",
          notifiedAt: draft.notifiedAt ?? new Date().toISOString(),
        });
      } catch {
        // Keep the local draft and retry when connectivity returns.
      }
    }
  }, [locale, showToast]);

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
