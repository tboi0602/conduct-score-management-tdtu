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
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { adminMessages } from "@/i18n/admin-messages";

type Toast = { id: number; message: string; tone: "success" | "error" };
type ToastContextValue = { showToast: (message: string, tone?: Toast["tone"]) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

function ToastItem({
  toast,
  close,
  closeLabel,
}: {
  toast: Toast;
  close: () => void;
  closeLabel: string;
}) {
  useEffect(() => {
    const timer = window.setTimeout(close, 5000);
    return () => window.clearTimeout(timer);
  }, [close]);
  const success = toast.tone === "success";
  return (
    <div
      role={success ? "status" : "alert"}
      className={`pointer-events-auto relative flex max-w-[340px] animate-[toastSlideDown_200ms_ease-out] items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-md ${success ? "border-[#b8dfcb]" : "border-[#f0bdc4]"}`}
    >
      {success ? (
        <CheckCircle2 size={15} className="shrink-0 text-[#1f7a4d]" />
      ) : (
        <CircleAlert size={15} className="shrink-0 text-[#bd3343]" />
      )}
      <p className="min-w-0 flex-1 text-xs font-semibold leading-4 text-[#263b58]">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={close}
        aria-label={closeLabel}
        className="grid h-5 w-5 shrink-0 place-items-center rounded text-[#718096] transition hover:bg-[#eef3f8] hover:text-[#102a50]"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { locale } = useLanguage();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }].slice(-4));
  }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-3 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            closeLabel={adminMessages[locale].closeNotification}
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
