"use client";

import { useState, type ReactNode } from "react";
import { Columns3, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
  const trimmedSearch = search?.trim() ?? "";
  const hasActiveFilters = Boolean(trimmedSearch || activeFilters.length > 0);
  const handleClear = () => {
    if (onClearFilters) onClearFilters();
    else onSearchChange?.("");
  };

  return (
    <div className="bg-[#f7f9fc] px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {onSearchChange ? (
            <div className="relative w-64">
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
        <div className="flex items-center gap-2">
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
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#e3ebf5] pt-2 text-xs text-[#263b58]">
            <span className="font-medium text-[#52647d]">{t.filteringBy}</span>
            {trimmedSearch ? (
              <span className="rounded bg-white px-1.5 py-0.5 font-semibold text-[#154a9b] shadow-sm">
                &ldquo;{trimmedSearch}&rdquo;
              </span>
            ) : null}
            {activeFilters.map((filter) => (
              <span
                key={filter.key}
                className="rounded bg-white px-1.5 py-0.5 font-semibold text-[#154a9b] shadow-sm"
              >
                {filter.label}
              </span>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="!h-6 !px-1.5 text-xs text-[#b72e3f] hover:bg-[#fff1f2]"
            >
              {t.clearFilters}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
