"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { AlertTriangle, Camera, CameraOff, LoaderCircle, QrCode, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { studentEventMessages } from "@/i18n/student-event-messages";
import {
  attendanceFailureStore,
  failureCategoryForRejection,
} from "@/lib/attendance-failure-store";
import { getAuthSession } from "@/lib/auth-storage";
import { attendanceService } from "@/services/attendance";
import type { AttendanceFailureCategory, AttendanceFailureDraft } from "@/types/attendance-failure";

function stopVideoStream(video: HTMLVideoElement | null): void {
  const stream = video?.srcObject as MediaStream | null;
  stream?.getTracks().forEach((track) => track.stop());
  if (video) video.srcObject = null;
}

export function StudentQrScanner() {
  const { locale } = useLanguage();
  const t = studentEventMessages[locale];
  const failureLabels: Record<AttendanceFailureCategory, string> = {
    NETWORK_ERROR: t.failureNetwork,
    QR_ERROR: t.failureQr,
    SESSION_EXPIRED: t.failureSessionExpired,
    TIMEOUT: t.failureTimeout,
    LOCATION_ERROR: t.failureLocation,
    SERVICE_ERROR: t.failureService,
    OTHER: t.failureOther,
  };
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scanHandledRef = useRef(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
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
    if (!cameraActive) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      stopVideoStream(videoRef.current);
      return;
    }

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(t.scannerCameraSecureContext);
      setCameraActive(false);
      return;
    }

    let cancelled = false;
    let sessionControls: IScannerControls | null = null;
    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 150,
      delayBetweenScanSuccess: 1000,
    });
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    scanHandledRef.current = false;
    setCameraError("");
    setCameraStarting(true);
    void reader
      .decodeFromConstraints(constraints, videoRef.current ?? undefined, (result) => {
        if (!result || cancelled || scanHandledRef.current) return;
        try {
          const url = new URL(result.getText(), window.location.origin);
          if (url.pathname !== "/events/check-in" || !url.searchParams.get("token")) {
            setCameraError(t.scannerInvalidQr);
            return;
          }

          scanHandledRef.current = true;
          controlsRef.current?.stop();
          stopVideoStream(videoRef.current);
          setCameraActive(false);
          router.push(`${url.pathname}${url.search}`);
        } catch {
          setCameraError(t.scannerReadError);
        }
      })
      .then((controls) => {
        sessionControls = controls;
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setCameraStarting(false);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const name = error instanceof DOMException ? error.name : "";
          setCameraError(
            name === "NotAllowedError" || name === "SecurityError"
              ? t.scannerCameraPermissionDenied
              : name === "NotFoundError" || name === "OverconstrainedError"
                ? t.scannerCameraNotFound
                : name === "NotReadableError" || name === "AbortError"
                  ? t.scannerCameraBusy
                  : t.scannerCameraError,
          );
          setCameraStarting(false);
          setCameraActive(false);
        }
      });
    return () => {
      cancelled = true;
      sessionControls?.stop();
      if (controlsRef.current === sessionControls) controlsRef.current = null;
      stopVideoStream(videoRef.current);
    };
  }, [
    cameraActive,
    router,
    t.scannerCameraBusy,
    t.scannerCameraError,
    t.scannerCameraNotFound,
    t.scannerCameraPermissionDenied,
    t.scannerCameraSecureContext,
    t.scannerInvalidQr,
    t.scannerReadError,
  ]);

  const removeFailure = async (id: string) => {
    await attendanceFailureStore.remove(id);
    setFailures((current) => current.filter((item) => item.clientAttemptId !== id));
  };

  return (
    <section className="mx-auto max-w-4xl">
      <header className="border-b border-[#e6d9dc] pb-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#154a9b]">
          <QrCode size={17} /> {t.studentPortal}
        </div>
        <h1 className="mt-3 text-3xl font-bold text-[#102a50]">{t.scannerTitle}</h1>
        <p className="mt-2 text-sm text-[#66758a]">{t.scannerDescription}</p>
      </header>

      <div className="mt-7 overflow-hidden rounded-3xl border border-[#d9e3ee] bg-white p-5 shadow-[0_20px_48px_-40px_rgba(16,42,80,.6)] sm:p-7">
        <div className="relative mx-auto aspect-square max-w-lg overflow-hidden rounded-2xl bg-[#171717]">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {cameraActive ? (
            <>
              <div className="pointer-events-none absolute inset-[15%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,.3)]" />
              <Camera
                className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80"
                size={28}
              />
            </>
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-[#101826] px-6 text-center text-white">
              <div>
                <CameraOff className="mx-auto text-white/70" size={42} />
                <p className="mt-3 text-sm text-white/70">{t.scannerCameraInactive}</p>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={cameraStarting}
          onClick={() => {
            setCameraError("");
            setCameraActive((active) => !active);
          }}
          className={`mx-auto mt-4 flex min-h-11 w-full max-w-lg items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition active:scale-[.98] disabled:cursor-wait disabled:opacity-70 ${
            cameraActive
              ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "bg-[#154a9b] text-white hover:bg-[#103f85]"
          }`}
        >
          {cameraStarting ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : cameraActive ? (
            <CameraOff size={18} />
          ) : (
            <Camera size={18} />
          )}
          {cameraStarting
            ? t.scannerOpeningCamera
            : cameraActive
              ? t.scannerCloseCamera
              : t.scannerOpenCamera}
        </button>
        {cameraError ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            {cameraError}
          </p>
        ) : null}
      </div>

      <article className="mt-7 rounded-3xl border border-[#d9e3ee] bg-white p-5 shadow-[0_20px_48px_-40px_rgba(16,42,80,.6)] sm:p-6">
        <div className="flex items-center gap-2 text-[#154a9b]">
          <AlertTriangle size={20} />
          <h2 className="font-bold">{t.scannerFailuresTitle}</h2>
        </div>
        <p className="mt-2 text-sm text-[#66758a]">{t.scannerFailuresDescription}</p>
        <div className="mt-4 space-y-3">
          {failures.map((failure) => (
            <div
              key={failure.clientAttemptId}
              className="flex items-start justify-between gap-4 rounded-xl border border-[#d9e3ee] p-4"
            >
              <div>
                <strong className="text-[#102a50]">{failure.eventName}</strong>
                <p className="mt-1 text-sm text-[#154a9b]">
                  {failureLabels[failure.failureCategory]}
                </p>
                <p className="mt-1 text-xs text-[#66758a]">
                  {new Date(failure.failedAt).toLocaleString(locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void removeFailure(failure.clientAttemptId)}
                aria-label={t.scannerDeleteRecord}
                className="rounded-lg p-2 text-[#66758a] hover:bg-[#edf4fc] hover:text-[#154a9b]"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
          {!failures.length ? (
            <p className="py-6 text-center text-sm text-[#8b747b]">{t.scannerNoFailures}</p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
