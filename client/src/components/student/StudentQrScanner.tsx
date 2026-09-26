"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { AlertTriangle, Camera, QrCode, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  attendanceFailureStore,
  failureCategoryForRejection,
} from "@/lib/attendance-failure-store";
import { getAuthSession } from "@/lib/auth-storage";
import { attendanceService } from "@/services/attendance";
import type { AttendanceFailureCategory, AttendanceFailureDraft } from "@/types/attendance-failure";

const failureLabels: Record<AttendanceFailureCategory, { vi: string; en: string }> = {
  NETWORK_ERROR: { vi: "Lỗi mạng", en: "Network error" },
  QR_ERROR: { vi: "Lỗi quét QR", en: "QR scan error" },
  SESSION_EXPIRED: { vi: "Phiên điểm danh đã kết thúc", en: "Attendance session expired" },
  TIMEOUT: { vi: "Quá thời gian chờ", en: "Request timed out" },
  LOCATION_ERROR: { vi: "Lỗi vị trí", en: "Location error" },
  SERVICE_ERROR: { vi: "Dịch vụ tạm thời gián đoạn", en: "Service temporarily unavailable" },
  OTHER: { vi: "Lỗi khác", en: "Other error" },
};

export function StudentQrScanner() {
  const { locale } = useLanguage();
  const vi = locale === "vi";
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [failures, setFailures] = useState<AttendanceFailureDraft[]>([]);

  const refreshFailures = useCallback(async () => {
    const session = getAuthSession();
    if (!session) return;
    const drafts = await attendanceFailureStore.listForUser(session.user.id);
    const now = Date.now();
    const visible: AttendanceFailureDraft[] = [];

    for (const draft of drafts) {
      const end = new Date(draft.eventEnd).getTime();
      if (!Number.isFinite(end)) continue;
      if (now > end + 7 * 24 * 60 * 60 * 1000) {
        await attendanceFailureStore.remove(draft.clientAttemptId);
        continue;
      }
      if (now <= end) continue;
      try {
        const response = await attendanceService.myAttempt(draft.clientAttemptId);
        const request = response.data.request;
        if (request?.status === "ACCEPTED") {
          await attendanceFailureStore.remove(draft.clientAttemptId);
          continue;
        }
        if (request?.status === "PENDING") continue;
        const reconciled: AttendanceFailureDraft = {
          ...draft,
          requestId: request?.id ?? draft.requestId,
          failureCategory: request
            ? failureCategoryForRejection(request.rejectionReason)
            : draft.failureCategory,
          status: "FAILED",
        };
        await attendanceFailureStore.put(reconciled);
        visible.push(reconciled);
      } catch {
        if (draft.status === "FAILED") visible.push(draft);
      }
    }
    setFailures(visible.sort((a, b) => b.failedAt.localeCompare(a.failedAt)));
  }, []);

  useEffect(() => {
    void refreshFailures();
    const online = () => void refreshFailures();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [refreshFailures]);

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserQRCodeReader();
    void reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (!result || cancelled) return;
        try {
          const url = new URL(result.getText(), window.location.origin);
          if (url.pathname !== "/events/check-in" || !url.searchParams.get("token")) {
            setCameraError(vi ? "Mã QR không thuộc hệ thống điểm danh." : "Unsupported QR code.");
            return;
          }
          controlsRef.current?.stop();
          router.push(`${url.pathname}${url.search}`);
        } catch {
          setCameraError(vi ? "Không thể đọc nội dung mã QR." : "Unable to read the QR code.");
        }
      })
      .then((controls) => {
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError(
            vi
              ? "Không thể mở camera. Hãy cấp quyền camera và thử lại."
              : "Unable to open the camera. Allow camera access and try again.",
          );
        }
      });
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [router, vi]);

  const removeFailure = async (id: string) => {
    await attendanceFailureStore.remove(id);
    setFailures((current) => current.filter((item) => item.clientAttemptId !== id));
  };

  return (
    <section className="mx-auto max-w-4xl">
      <header className="border-b border-[#e6d9dc] pb-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#b42332]">
          <QrCode size={17} /> TDTU Student
        </div>
        <h1 className="mt-3 text-3xl font-bold text-[#34242a]">
          {vi ? "Quét mã QR" : "Scan QR code"}
        </h1>
        <p className="mt-2 text-sm text-[#765f66]">
          {vi
            ? "Đưa mã QR điểm danh vào khung camera."
            : "Place the attendance QR code inside the camera frame."}
        </p>
      </header>

      <div className="mt-7 overflow-hidden rounded-3xl border border-[#eadde0] bg-white p-5 shadow-sm sm:p-7">
        <div className="relative mx-auto aspect-square max-w-lg overflow-hidden rounded-2xl bg-[#171717]">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-[15%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,.3)]" />
          <Camera className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80" size={28} />
        </div>
        {cameraError ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            {cameraError}
          </p>
        ) : null}
      </div>

      <article className="mt-7 rounded-3xl border border-[#eadde0] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-[#b42332]">
          <AlertTriangle size={20} />
          <h2 className="font-bold">
            {vi ? "Lần điểm danh chưa được ghi nhận" : "Unrecorded attendance attempts"}
          </h2>
        </div>
        <p className="mt-2 text-sm text-[#765f66]">
          {vi
            ? "Chỉ hiển thị lỗi sau khi sự kiện đã kết thúc."
            : "Failures appear only after the event has ended."}
        </p>
        <div className="mt-4 space-y-3">
          {failures.map((failure) => (
            <div
              key={failure.clientAttemptId}
              className="flex items-start justify-between gap-4 rounded-xl border border-[#eadde0] p-4"
            >
              <div>
                <strong className="text-[#34242a]">{failure.eventName}</strong>
                <p className="mt-1 text-sm text-[#b42332]">
                  {failureLabels[failure.failureCategory][locale]}
                </p>
                <p className="mt-1 text-xs text-[#765f66]">
                  {new Date(failure.failedAt).toLocaleString(locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void removeFailure(failure.clientAttemptId)}
                aria-label={vi ? "Xóa bản ghi" : "Delete record"}
                className="rounded-lg p-2 text-[#765f66] hover:bg-[#fff1f3] hover:text-[#b42332]"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
          {!failures.length ? (
            <p className="py-6 text-center text-sm text-[#8b747b]">
              {vi ? "Không có lần điểm danh lỗi." : "No failed attendance attempts."}
            </p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
