"use client";

import { useState, type ReactNode } from "react";
import { Columns3, Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import type { ColumnDef } from "@/hooks/ui/useColumns";

export interface SheetToolbarProps<T> {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
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
  actions,
  columns,
  hiddenColumnKeys = [],
  onToggleColumn,
}: SheetToolbarProps<T>) {
  const [colMenuOpen, setColMenuOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f7f9fc] px-3 py-2">
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
    </div>
  );
}
