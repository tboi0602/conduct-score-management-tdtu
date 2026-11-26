"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyTable, TableSkeleton } from "@/components/admin/TableState";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import type { ColumnAlign, ColumnDef, HeaderWeight } from "@/hooks/ui/useColumns";
import type { PaginationMeta } from "@/types/admin";

const ALIGN_CLASS: Record<ColumnAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const WEIGHT_CLASS: Record<HeaderWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

export interface SheetTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  error?: string | null;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: ReactNode;
}

export function SheetTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  error,
  pagination,
  onPageChange,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  emptyTitle,
  emptyDescription,
  toolbar,
}: SheetTableProps<T>) {
  const { t } = useAdminTranslations();
  const [selection, setSelection] = useState<{
    start: { r: number; c: number };
    end: { r: number; c: number };
  } | null>(null);
  const draggingRef = useRef(false);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const onMouseUp = () => {
      draggingRef.current = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && selection && tableRef.current) {
        const minR = Math.min(selection.start.r, selection.end.r);
        const maxR = Math.max(selection.start.r, selection.end.r);
        const minC = Math.min(selection.start.c, selection.end.c);
        const maxC = Math.max(selection.start.c, selection.end.c);
        const lines: string[] = [];
        for (let r = minR; r <= maxR; r += 1) {
          const cells: string[] = [];
          for (let c = minC; c <= maxC; c += 1) {
            const el = tableRef.current.querySelector<HTMLTableCellElement>(
              `td[data-r="${r}"][data-c="${c}"]`,
            );
            cells.push((el?.innerText ?? "").trim());
          }
          lines.push(cells.join("\t"));
        }
        void navigator.clipboard?.writeText(lines.join("\n"));
      }
    };
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selection]);

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {toolbar}
      <div className=" min-h-0 flex-1 overflow-auto border-t border-[#e2e8f0]">
        <table ref={tableRef} className="w-full select-none border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-30 bg-[#f7f9fc] text-[11px] uppercase tracking-[.06em] text-[#52647d] shadow-[inset_0_-1px_0_#d8e2ee]">
            <tr>
              {columns.map((col) => {
                const align = ALIGN_CLASS[col.align ?? "left"];
                const weight = WEIGHT_CLASS[col.headerWeight ?? "bold"];
                const isSorted = sortBy === col.key;
                const stickyCls =
                  col.sticky === "left"
                    ? "sticky left-0 z-40 bg-[#f7f9fc]"
                    : col.sticky === "right"
                      ? "sticky right-0 z-40 bg-[#f7f9fc]"
                      : "";
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width, minWidth: col.minWidth }}
                    className={`whitespace-nowrap border-r border-[#e2e8f0] px-2.5 py-1.5 last:border-r-0 ${align} ${weight} ${stickyCls}`}
                  >
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-[#154a9b]"
                      >
                        {col.title}
                        {isSorted ? (
                          sortOrder === "asc" ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          )
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.title
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          {isLoading ? (
            <TableSkeleton columns={columns.length} />
          ) : (
            <tbody className="divide-y divide-[#e2e8f0]">
              {data.map((row, index) => (
                <tr
                  key={rowKey(row)}
                  onDoubleClick={onRowClick ? () => onRowClick(row) : undefined}
                  className="even:bg-[#f8fafc] transition-colors hover:bg-[#edf4fc]/70"
                >
                  {columns.map((col, colIndex) => {
                    const isCellActive =
                      selection &&
                      index >= Math.min(selection.start.r, selection.end.r) &&
                      index <= Math.max(selection.start.r, selection.end.r) &&
                      colIndex >= Math.min(selection.start.c, selection.end.c) &&
                      colIndex <= Math.max(selection.start.c, selection.end.c);
                    const isAnchor =
                      selection?.start.r === index && selection?.start.c === colIndex;
                    const align = ALIGN_CLASS[col.align ?? "left"];
                    const stickyCls =
                      col.sticky === "left"
                        ? "sticky left-0 z-10 bg-[#f7f9fc]"
                        : col.sticky === "right"
                          ? "sticky right-0 z-10 bg-white"
                          : "";
                    return (
                      <td
                        key={col.key}
                        data-r={index}
                        data-c={colIndex}
                        onMouseDown={() => {
                          draggingRef.current = true;
                          setSelection({
                            start: { r: index, c: colIndex },
                            end: { r: index, c: colIndex },
                          });
                        }}
                        onMouseEnter={() => {
                          if (draggingRef.current) {
                            setSelection((prev) =>
                              prev ? { ...prev, end: { r: index, c: colIndex } } : null,
                            );
                          }
                        }}
                        style={{ width: col.width, minWidth: col.minWidth }}
                        className={`cursor-cell whitespace-nowrap border-r border-[#e2e8f0] px-2.5 py-1.5 text-[12px] leading-tight last:border-r-0 ${align} ${stickyCls} ${
                          isAnchor
                            ? "ring-2 ring-inset ring-[#154273]"
                            : isCellActive
                              ? "bg-[#dbeafe]/60"
                              : ""
                        }`}
                      >
                        {col.render(row, index)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          )}
        </table>
        {!isLoading && !error && data.length === 0 ? (
          <EmptyTable title={emptyTitle ?? t.noData} description={emptyDescription ?? t.tryFilter} />
        ) : null}
        {error ? <p className="p-4 text-sm text-[#b72e3f]">{error}</p> : null}
      </div>
      {pagination && onPageChange ? (
        <div className="flex h-8 shrink-0 items-center justify-between border-t border-[#e2e8f0] bg-[#f7f9fc] px-3 text-[11px] text-[#66758a]">
          <span>
            {pagination.total} {t.records} · {t.page} {pagination.page}/{Math.max(1, pagination.totalPages)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="grid h-6 w-6 place-items-center rounded border border-[#d5dfeb] bg-white text-[#263b58] transition hover:bg-[#edf4fc] disabled:opacity-40"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              disabled={pagination.page >= Math.max(1, pagination.totalPages)}
              onClick={() => onPageChange(pagination.page + 1)}
              className="grid h-6 w-6 place-items-center rounded border border-[#d5dfeb] bg-white text-[#263b58] transition hover:bg-[#edf4fc] disabled:opacity-40"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
