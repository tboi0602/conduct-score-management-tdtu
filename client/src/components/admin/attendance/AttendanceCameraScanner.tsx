"use client";

import { useEffect, useRef, useState } from "react";
import { BarcodeFormat, BrowserMultiFormatOneDReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import { Camera, CameraOff, LoaderCircle } from "lucide-react";

const BARCODE_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
];

function stopVideoStream(video: HTMLVideoElement | null): void {
  const stream = video?.srcObject as MediaStream | null;
  stream?.getTracks().forEach((track) => track.stop());
  if (video) video.srcObject = null;
}

export function AttendanceCameraScanner({
  onScan,
  disabled = false,
  errorText = "Không thể mở camera. Vui lòng cấp quyền truy cập camera.",
  openLabel = "Quét bằng Camera",
  stopLabel = "Tắt camera",
  scanningLabel = "Hướng camera vào mã vạch (Barcode)",
}: {
  onScan: (code: string) => Promise<unknown>;
  disabled?: boolean;
  errorText?: string;
  openLabel?: string;
  stopLabel?: string;
  scanningLabel?: string;
}) {
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScannedCodeRef = useRef("");
  const lastScannedTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  const disabledRef = useRef(disabled);
  const scanPendingRef = useRef(false);

  useEffect(() => {
    onScanRef.current = onScan;
    disabledRef.current = disabled;
  });

  useEffect(() => {
    if (!active) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      stopVideoStream(videoRef.current);
      return;
    }

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(errorText);
      setActive(false);
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) {
      setError(errorText);
      setActive(false);
      return;
    }

    let isCancelled = false;
    let sessionControls: IScannerControls | null = null;
    let sessionStream: MediaStream | null = null;

    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, BARCODE_FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatOneDReader(hints, {
      delayBetweenScanAttempts: 50,
      delayBetweenScanSuccess: 500,
    });

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    const handleDecode = (result: { getText(): string } | undefined) => {
      if (!result || isCancelled || disabledRef.current || scanPendingRef.current) return;
      const text = result.getText().trim().toUpperCase();
      if (!text) return;

      // Prevent repeated scans of the exact same code within 3 seconds
      const now = Date.now();
      if (text === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 3000) {
        return;
      }

      lastScannedCodeRef.current = text;
      lastScannedTimeRef.current = now;
      scanPendingRef.current = true;
      void onScanRef
        .current(text)
        .catch(() => undefined)
        .finally(() => {
          window.setTimeout(() => {
            scanPendingRef.current = false;
          }, 750);
        });
    };

    const startCamera = async () => {
      try {
        sessionStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (isCancelled) {
          sessionStream.getTracks().forEach((track) => track.stop());
          return;
        }

        videoElement.srcObject = sessionStream;
        videoElement.muted = true;
        videoElement.playsInline = true;
        await videoElement.play();

        if (isCancelled) return;
        const controls = await reader.decodeFromVideoElement(videoElement, (result) => {
          handleDecode(result);
        });
        sessionControls = controls;
        if (isCancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
          setError("");
          setStarting(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error("Camera scanner error:", err);
          setError(errorText);
          setStarting(false);
          setActive(false);
        }
      }
    };

    setError("");
    setStarting(true);
    void startCamera();

    return () => {
      isCancelled = true;
      sessionControls?.stop();
      sessionStream?.getTracks().forEach((track) => track.stop());
      if (controlsRef.current === sessionControls) controlsRef.current = null;
      stopVideoStream(videoElement);
    };
  }, [active, errorText]);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={disabled || starting}
          onClick={() => {
            setError("");
            setActive((prev) => !prev);
          }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            active
              ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
              : "bg-[#edf4fc] text-[#154a9b] border border-[#d2e2f5] hover:bg-[#e1edfa]"
          }`}
        >
          {starting ? (
            <>
              <LoaderCircle className="animate-spin" size={16} /> {openLabel}
            </>
          ) : active ? (
            <>
              <CameraOff size={16} /> {stopLabel}
            </>
          ) : (
            <>
              <Camera size={16} /> {openLabel}
            </>
          )}
        </button>
      </div>

      {active ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#d9e3ee] bg-[#111827] p-3 text-center">
          <div className="relative mx-auto aspect-video max-h-56 overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-[12%] rounded-xl border-2 border-emerald-400 shadow-[0_0_0_999px_rgba(0,0,0,0.45)]" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
          </div>
          <p className="mt-2 text-xs font-medium text-slate-300">{scanningLabel}</p>
        </div>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
