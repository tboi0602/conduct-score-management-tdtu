"use client";

import { useEffect, useMemo, useState } from "react";

export function usePageSelection(selectableIds: string[]) {
  const signature = selectableIds.join("|");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [signature]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedSet.has(id));
  const someSelected = selectableIds.some((id) => selectedSet.has(id)) && !allSelected;

  return {
    selectedIds,
    selectedSet,
    allSelected,
    someSelected,
    clear: () => setSelectedIds([]),
    toggle: (id: string) =>
      setSelectedIds((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      ),
    toggleAll: () => setSelectedIds(allSelected ? [] : selectableIds),
  };
}
