"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";

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
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const { t } = useAdminTranslations();
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
  const width = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[#0b1f3a]/30 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`my-6 w-full ${width} animate-[modal-in_.2s_cubic-bezier(.16,1,.3,1)] overflow-hidden rounded-xl border border-[#e3eaf2] bg-white shadow-xl`}
      >
        <header className="relative z-20 flex items-start justify-between gap-4 border-b border-[#e3eaf2] bg-[#f9fbfd] px-5 py-3.5">
          <div>
            <h2 id="modal-title" className="text-xl font-bold tracking-tight text-[#102a50]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1.5 text-sm leading-6 text-[#66758a]">{description}</p>
            ) : null}
          </div>
          <IconButton label={t.close} onClick={onClose}>
            <X size={17} strokeWidth={2} />
          </IconButton>
        </header>
        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto bg-white p-6">{children}</div>
      </section>
    </div>
  );
}
