"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";

export function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  const { t } = useAdminTranslations();
  if (count === 0) return null;
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#bed0e6] bg-[#f2f7fd] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-bold text-[#154a9b]">
        <span>{t.selectedCount.replace("{count}", String(count))}</span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#52647d] hover:bg-white"
        >
          <X size={14} /> {t.clearSelection}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
