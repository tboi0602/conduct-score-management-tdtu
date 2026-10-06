"use client";

import { useEffect, useRef, useState } from "react";
import { BarcodeFormat, BrowserMultiFormatOneDReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import { Camera, CameraOff } from "lucide-react";

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

export function AttendanceCameraScanner({
  onScan,
  disabled = false,
  errorText = "Không thể mở camera. Vui lòng cấp quyền truy cập camera.",
}: {
  onScan: (code: string) => void;
  disabled?: boolean;
  errorText?: string;
}) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScannedCodeRef = useRef("");
  const lastScannedTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    onScanRef.current = onScan;
    disabledRef.current = disabled;
  });

  useEffect(() => {
    if (!active) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    let isCancelled = false;

    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, BARCODE_FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatOneDReader(hints, {
      delayBetweenScanAttempts: 50,
      delayBetweenScanSuccess: 500,
    });

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 },
      },
    };

    reader
      .decodeFromConstraints(constraints, videoRef.current ?? undefined, (result) => {
        if (!result || isCancelled || disabledRef.current) return;
        const text = result.getText().trim();
        if (!text) return;

        // Prevent repeated scans of the exact same code within 3 seconds
        const now = Date.now();
        if (text === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 3000) {
          return;
        }

        lastScannedCodeRef.current = text;
        lastScannedTimeRef.current = now;
        onScanRef.current(text);
      })
      .then((controls) => {
        if (isCancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
          setError("");
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          console.error("Camera scanner error:", err);
          setError(errorText);
        }
      });

    return () => {
      isCancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [active, errorText]);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActive((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            active
              ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
              : "bg-[#edf4fc] text-[#154a9b] border border-[#d2e2f5] hover:bg-[#e1edfa]"
          }`}
        >
          {active ? (
            <>
              <CameraOff size={16} /> Tắt camera
            </>
          ) : (
            <>
              <Camera size={16} /> Quét bằng Camera
            </>
          )}
        </button>
      </div>

      {active ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#d9e3ee] bg-[#111827] p-3 text-center">
          <div className="relative mx-auto aspect-video max-h-56 overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-[12%] rounded-xl border-2 border-emerald-400 shadow-[0_0_0_999px_rgba(0,0,0,0.45)]" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
          </div>
          <p className="mt-2 text-xs font-medium text-slate-300">
            Hướng camera vào mã vạch (Barcode)
          </p>
          {error ? (
            <p className="mt-2 rounded-lg bg-rose-900/60 p-2 text-xs font-semibold text-rose-200">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
