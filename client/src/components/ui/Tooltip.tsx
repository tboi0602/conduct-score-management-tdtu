"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export function Tooltip({
  label,
  children,
  side = "top",
  className = "",
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "right";
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const containerRef = useRef<HTMLSpanElement>(null);
  const updatePosition = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(
      side === "right"
        ? { left: rect.right + 12, top: rect.top + rect.height / 2 }
        : { left: rect.left + rect.width / 2, top: rect.top - 8 },
    );
  }, [side]);
  useEffect(() => {
    if (!visible) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [updatePosition, visible]);
  return (
    <span
      ref={containerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => {
        updatePosition();
        setVisible(true);
      }}
      onMouseLeave={() => {
        setDismissed(false);
        setVisible(false);
      }}
      onFocusCapture={() => {
        updatePosition();
        setVisible(true);
      }}
      onBlurCapture={() => setVisible(false)}
      onClick={() => {
        setDismissed(true);
        setVisible(false);
      }}
    >
      {children}
      {visible && !dismissed && typeof document !== "undefined"
        ? createPortal(
            <span
              role="tooltip"
              style={{ left: position.left, top: position.top }}
              className={`pointer-events-none fixed z-[100] whitespace-nowrap rounded-lg bg-[#102a50] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(16,42,80,.55)] ${
                side === "right" ? "-translate-y-1/2" : "-translate-x-1/2 -translate-y-full"
              }`}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
