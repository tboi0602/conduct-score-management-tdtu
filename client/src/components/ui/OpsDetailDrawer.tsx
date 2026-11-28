"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export type DrawerMode = "view" | "create" | "edit";

export interface OpsDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  mode?: DrawerMode;
  storageKey?: string;
  defaultWidth?: number;
  minWidth?: number;
  footer?: ReactNode;
  children: ReactNode;
}

export function OpsDetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  storageKey = "ops.drawer.width",
  defaultWidth = 480,
  minWidth = 360,
  footer,
  children,
}: OpsDetailDrawerProps) {
  const [width, setWidth] = useState(defaultWidth);
  const draggingRef = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed) && parsed >= minWidth) {
          setWidth(parsed);
        }
      }
    } catch {
      // Ignore storage errors.
    }
  }, [storageKey, minWidth]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const maxW = Math.floor(window.innerWidth * 0.55);
      const next = Math.min(maxW, Math.max(minWidth, window.innerWidth - e.clientX));
      setWidth(next);
    };
    const onMouseUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        window.localStorage.setItem(storageKey, String(width));
      } catch {
        // Ignore storage errors.
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [minWidth, storageKey, width]);

  if (!open) return null;

  return (
    <aside
      style={{ width }}
      className="relative flex h-full max-w-[55vw] shrink-0 animate-[opsSlideInRight_220ms_ease-out] flex-col border-l border-[#dce4ef] bg-white"
    >
      <div
        onMouseDown={() => {
          draggingRef.current = true;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        }}
        className="group absolute bottom-0 left-0 top-0 flex w-2 cursor-col-resize items-center justify-center transition-colors hover:bg-[#154a9b]/10"
      >
        <span className="h-16 w-1 rounded-full bg-[#154273]/70 transition group-hover:bg-[#154273]" />
      </div>
      <header className="flex items-start justify-between gap-3 border-b border-[#e2e8f0] px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-[#102a50]">{title}</h2>
          {subtitle ? <p className="mt-0.5 truncate text-xs text-[#68788d]">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-[#68788d] transition hover:bg-[#f3f6fa] hover:text-[#102a50]"
        >
          <X size={18} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer ? (
        <footer className="flex items-center justify-end gap-2 border-t border-[#e2e8f0] bg-[#f7f9fc] px-5 py-3">
          {footer}
        </footer>
      ) : null}
    </aside>
  );
}
