"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose, open]);
  if (!open) return null;
  const width = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[#0b1f3a]/45 p-4 backdrop-blur-[3px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`my-6 w-full ${width} animate-[modal-in_.25s_cubic-bezier(.16,1,.3,1)] rounded-[24px] border border-white/70 bg-white shadow-[0_30px_70px_-25px_rgba(16,42,80,.45)]`}
      >
        <header className="relative z-20 flex items-start justify-between gap-4 rounded-t-[24px] border-b border-[#e6ebf2] bg-white px-6 py-5">
          <div>
            <h2 id="modal-title" className="text-xl font-bold tracking-tight text-[#102a50]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1.5 text-sm leading-6 text-[#66758a]">{description}</p>
            ) : null}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={17} strokeWidth={2} />
          </IconButton>
        </header>
        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto rounded-b-[24px] bg-white p-6">
          {children}
        </div>
      </section>
    </div>
  );
}
