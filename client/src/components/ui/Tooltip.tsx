"use client";

import { useState } from "react";
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
  const position =
    side === "right"
      ? "left-full top-1/2 ml-3 -translate-y-1/2"
      : "bottom-full left-1/2 mb-2 -translate-x-1/2";
  return (
    <span
      className={`group/tooltip relative inline-flex ${className}`}
      onClick={() => setDismissed(true)}
      onMouseLeave={() => setDismissed(false)}
    >
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${position} z-20 whitespace-nowrap rounded-lg bg-[#102a50] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(16,42,80,.55)] transition duration-200 ${dismissed ? "invisible opacity-0" : "opacity-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"}`}
      >
        {label}
      </span>
    </span>
  );
}
