"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Columns3, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import type { ColumnDef } from "@/hooks/ui/useColumns";

export interface SheetToolbarProps<T> {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  activeFilters?: Array<{ key: string; label: string }>;
  onClearFilters?: () => void;
  actions?: ReactNode;
  columns?: ColumnDef<T>[];
  hiddenColumnKeys?: string[];
  onToggleColumn?: (key: string) => void;
}

export function SheetToolbar<T>({
  search,
  onSearchChange,
  searchPlaceholder = "...",
  filters,
  activeFilters = [],
  onClearFilters,
  actions,
  columns,
  hiddenColumnKeys = [],
  onToggleColumn,
}: SheetToolbarProps<T>) {
  const { t } = useAdminTranslations();
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateScrollButtons);
    observer.observe(el);
    return () => observer.disconnect();
  }, [filters, search, updateScrollButtons]);

  const scrollByAmount = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  const trimmedSearch = search?.trim() ?? "";
  const hasActiveFilters = Boolean(trimmedSearch || activeFilters.length > 0);
  const handleClear = () => {
    if (onClearFilters) onClearFilters();
    else onSearchChange?.("");
  };

  return (
    <div className="bg-[#f7f9fc] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {canScrollLeft ? (
            <IconButton
              label="<"
              onClick={() => scrollByAmount(-220)}
              className="!h-8 !w-7 shrink-0 !rounded-lg"
            >
              <ChevronLeft size={14} />
            </IconButton>
          ) : null}
          <div
            ref={scrollRef}
            onScroll={updateScrollButtons}
            className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {onSearchChange ? (
              <div className="relative w-64 shrink-0">
                <Input
                  value={search ?? ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  prefixIcon={<Search size={14} />}
                  className="h-8 text-xs"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#68788d] hover:text-[#102a50]"
                  >
                    <X size={13} />
                  </button>
                ) : null}
              </div>
            ) : null}
            {filters}
          </div>
          {canScrollRight ? (
            <IconButton
              label=">"
              onClick={() => scrollByAmount(220)}
              className="!h-8 !w-7 shrink-0 !rounded-lg"
            >
              <ChevronRight size={14} />
            </IconButton>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {columns && onToggleColumn ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setColMenuOpen((prev) => !prev)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#cdd9e7] bg-white px-2.5 text-xs font-semibold text-[#263b58] hover:bg-[#f0f6fd]"
              >
                <Columns3 size={14} />
              </button>
              {colMenuOpen ? (
                <div className="absolute right-0 top-9 z-50 w-52 rounded-xl border border-[#dce4ef] bg-white p-2 shadow-lg">
                  {columns.map((col) => (
                    <label
                      key={col.key}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[#263b58] hover:bg-[#f3f6fa]"
                    >
                      <input
                        type="checkbox"
                        checked={!hiddenColumnKeys.includes(col.key)}
                        onChange={() => onToggleColumn(col.key)}
                        className="accent-[#154a9b]"
                      />
                      <span className="truncate">{col.title}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {actions}
        </div>
        {hasActiveFilters ? (
          <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-full border border-[#bfd0e8] bg-white/95 px-4 py-1.5 text-xs text-[#263b58] shadow-[0_12px_28px_-12px_rgba(16,42,80,.35)] backdrop-blur-sm">
            <span className="font-medium text-[#52647d]">{t.filteringBy}</span>
            {trimmedSearch ? (
              <span className="rounded-full bg-[#edf4fc] px-2 py-0.5 font-semibold text-[#154a9b]">
                &ldquo;{trimmedSearch}&rdquo;
              </span>
            ) : null}
            {activeFilters.map((filter) => (
              <span
                key={filter.key}
                className="rounded-full bg-[#edf4fc] px-2 py-0.5 font-semibold text-[#154a9b]"
              >
                {filter.label}
              </span>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="!h-6 !rounded-full !px-2 text-xs text-[#b72e3f] hover:bg-[#fff1f2]"
            >
              {t.clearFilters}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
