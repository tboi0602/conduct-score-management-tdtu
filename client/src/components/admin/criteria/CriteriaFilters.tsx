"use client";

import { useState, type FormEvent } from "react";
import { FilterX, Search } from "lucide-react";
import {
  filterPanel,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/admin/management-styles";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import type { CriteriaFilters as Filters } from "@/types/events";

export function CriteriaFilters({
  searchTerm,
  onSearch,
  onApply,
  onClear,
}: {
  searchTerm: string;
  onSearch: (value: string) => void;
  onApply: (filters: Filters) => void;
  onClear: () => void;
}) {
  const { t } = useAdminTranslations();
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [invalidRange, setInvalidRange] = useState(false);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (min !== "" && max !== "" && Number(min) > Number(max)) {
      setInvalidRange(true);
      return;
    }
    setInvalidRange(false);
    onApply({ minPoints: min, maxPoints: max });
  }
  return (
    <form onSubmit={apply} className={filterPanel}>
      <div className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_auto]">
        <label className="text-sm font-semibold text-[#263b58]">
          {t.search}
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-5 text-[#718096]"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => onSearch(event.target.value)}
              placeholder={t.criteriaSearch}
              maxLength={100}
              className={`${inputClass} pl-10`}
            />
          </div>
        </label>
        <label className="text-xs font-semibold text-[#66758a]">
          {t.minPoints}
          <input
            type="number"
            min={0}
            max={2147483647}
            step={1}
            value={min}
            onChange={(event) => setMin(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#66758a]">
          {t.maxPointsFilter}
          <input
            type="number"
            min={0}
            max={2147483647}
            step={1}
            value={max}
            onChange={(event) => setMax(event.target.value)}
            className={inputClass}
          />
        </label>
        <div className="flex gap-2">
          <button type="submit" className={primaryButton}>
            {t.applyFilter}
          </button>
          <button
            type="button"
            onClick={() => {
              setMin("");
              setMax("");
              setInvalidRange(false);
              onClear();
            }}
            className={secondaryButton}
          >
            <FilterX size={16} />
            {t.clearFilter}
          </button>
        </div>
      </div>
      {searchTerm.trim().length > 0 && searchTerm.trim().length < 3 ? (
        <p className="mt-3 text-xs text-[#66758a]">{t.searchHint}</p>
      ) : null}
      {invalidRange ? (
        <p role="alert" className="mt-3 text-sm text-[#b72e3f]">
          {t.invalidRange}
        </p>
      ) : null}
    </form>
  );
}
