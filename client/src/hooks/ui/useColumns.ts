"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

export type ColumnAlign = "left" | "center" | "right";
export type HeaderWeight = "normal" | "medium" | "semibold" | "bold";

export interface ColumnDef<T> {
  key: string;
  title: string;
  width?: number | string;
  minWidth?: number;
  align?: ColumnAlign;
  headerWeight?: HeaderWeight;
  sticky?: "left" | "right";
  sortable?: boolean;
  hidden?: boolean;
  render: (row: T, index: number) => ReactNode;
}

export function useColumns<T>(definitions: ColumnDef<T>[], storageKey?: string) {
  const [hiddenKeys, setHiddenKeys] = useState<string[]>(() =>
    definitions.filter((col) => col.hidden).map((col) => col.key),
  );

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setHiddenKeys(parsed.filter((k) => typeof k === "string"));
      }
    } catch {
      // Ignore malformed localStorage value.
    }
  }, [storageKey]);

  const toggleColumn = useCallback(
    (key: string) => {
      setHiddenKeys((prev) => {
        const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
        if (storageKey) {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        }
        return next;
      });
    },
    [storageKey],
  );

  const visibleColumns = useMemo(
    () => definitions.filter((col) => !hiddenKeys.includes(col.key)),
    [definitions, hiddenKeys],
  );

  return {
    allColumns: definitions,
    visibleColumns,
    hiddenKeys,
    toggleColumn,
  };
}
