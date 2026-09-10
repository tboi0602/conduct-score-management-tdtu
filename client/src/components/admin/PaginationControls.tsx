"use client";

import type { PaginationMeta } from "@/types/admin";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function pageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis-end", total];
  if (current >= total - 3)
    return [1, "ellipsis-start", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total];
}

export function PaginationControls({
  pagination,
  onPageChange,
  disabled = false,
  maxOffset,
}: {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  maxOffset?: number;
}) {
  const { t } = useAdminTranslations();
  const availablePages = Math.max(
    1,
    Math.min(
      pagination.totalPages,
      maxOffset === undefined
        ? pagination.totalPages
        : Math.floor(maxOffset / pagination.limit) + 1,
    ),
  );
  const items = pageItems(pagination.page, availablePages);
  return (
    <div className="flex flex-col gap-3 border-t border-[#e2e8f1] px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[#66758a]">
        <strong className="text-[#263b58]">{pagination.total}</strong> {t.records} · {t.page}{" "}
        {pagination.page}/{Math.max(pagination.totalPages, 1)}
      </span>
      <nav className="flex flex-wrap items-center gap-1.5" aria-label={`${t.page} pagination`}>
        <button
          type="button"
          disabled={disabled || !pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.page - 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#cad5e5] px-3 py-2 font-semibold text-[#40546f] transition hover:bg-[#f3f6fa] active:scale-[.98] disabled:opacity-40"
        >
          <ChevronLeft size={15} />
          {t.previous}
        </button>
        {items.map((item) =>
          typeof item === "number" ? (
            <button
              key={item}
              type="button"
              aria-label={`${t.page} ${item}`}
              aria-current={item === pagination.page ? "page" : undefined}
              disabled={disabled || item === pagination.page}
              onClick={() => onPageChange(item)}
              className={`grid h-9 min-w-9 place-items-center rounded-xl border px-2 text-sm font-bold tabular-nums transition active:scale-[.96] disabled:cursor-default ${item === pagination.page ? "border-[#154a9b] bg-[#154a9b] text-white shadow-[0_8px_18px_-10px_rgba(21,74,155,.8)] disabled:opacity-100" : "border-[#cad5e5] text-[#40546f] hover:border-[#9fb7d5] hover:bg-[#f3f6fa] disabled:opacity-40"}`}
            >
              {item}
            </button>
          ) : (
            <span
              key={item}
              aria-hidden="true"
              className="grid h-9 min-w-7 place-items-center text-[#718096]"
            >
              …
            </span>
          ),
        )}
        <button
          type="button"
          disabled={disabled || !pagination.hasNextPage || pagination.page >= availablePages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#cad5e5] px-3 py-2 font-semibold text-[#40546f] transition hover:bg-[#f3f6fa] active:scale-[.98] disabled:opacity-40"
        >
          {t.next}
          <ChevronRight size={15} />
        </button>
      </nav>
    </div>
  );
}
