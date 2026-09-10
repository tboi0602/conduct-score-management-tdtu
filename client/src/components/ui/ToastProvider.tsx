"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Toast = { id: number; message: string; tone: "success" | "error" };
type ToastContextValue = { showToast: (message: string, tone?: Toast["tone"]) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

function ToastItem({ toast, close }: { toast: Toast; close: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(close, 5000);
    return () => window.clearTimeout(timer);
  }, [close]);
  const success = toast.tone === "success";
  return (
    <div
      role={success ? "status" : "alert"}
      className={`pointer-events-auto flex w-[min(360px,calc(100vw-2rem))] items-start gap-3 rounded-2xl border bg-white p-4 shadow-[0_18px_50px_-20px_rgba(16,42,80,.45)] ${success ? "border-[#b8dfcb]" : "border-[#f0bdc4]"}`}
    >
      {success ? (
        <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-[#1f7a4d]" />
      ) : (
        <CircleAlert size={19} className="mt-0.5 shrink-0 text-[#bd3343]" />
      )}
      <p className="min-w-0 flex-1 text-sm font-semibold leading-5 text-[#263b58]">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={close}
        aria-label="Close notification"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#718096] transition hover:bg-[#eef3f8] hover:text-[#102a50]"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }].slice(-4));
  }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-3">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            close={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
