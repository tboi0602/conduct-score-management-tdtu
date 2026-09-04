"use client";

import type { PaginationMeta } from "@/types/admin";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";

export function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  const { t } = useAdminTranslations();
  return (
    <div className="flex flex-col gap-3 border-t border-[#e2e8f1] px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[#66758a]">
        <strong className="text-[#263b58]">{pagination.total}</strong> {t.records} · {t.page}{" "}
        {pagination.page}/{Math.max(pagination.totalPages, 1)}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.page - 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#cad5e5] px-3 py-2 font-semibold text-[#40546f] transition hover:bg-[#f3f6fa] active:scale-[.98] disabled:opacity-40"
        >
          <ChevronLeft size={15} />
          {t.previous}
        </button>
        <button
          type="button"
          disabled={!pagination.hasNextPage}
          onClick={() => onPageChange(pagination.page + 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#cad5e5] px-3 py-2 font-semibold text-[#40546f] transition hover:bg-[#f3f6fa] active:scale-[.98] disabled:opacity-40"
        >
          {t.next}
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
