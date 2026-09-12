"use client";

import { useState, type FormEvent } from "react";
import { FilterX } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import {
  filterPanel,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/admin/management-styles";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import type { SemesterFilters as Filters, SemesterType } from "@/types/events";

export function SemesterFilters({
  onApply,
  onClear,
}: {
  onApply: (filters: Filters) => void;
  onClear: () => void;
}) {
  const { t } = useAdminTranslations();
  const [year, setYear] = useState("");
  const [type, setType] = useState<SemesterType | "">("");
  return (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onApply({ year: year || undefined, type: type || undefined });
      }}
      className={filterPanel}
    >
      <div className="grid items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm font-semibold text-[#263b58]">
          {t.year}
          <input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className={inputClass}
          />
        </label>
        <div className="space-y-2 text-sm font-semibold text-[#263b58]">
          <p>{t.semesterType}</p>
          <CustomSelect
            value={type}
            onChange={(value) => setType(value as SemesterType | "")}
            placeholder={t.allSemesterTypes}
            ariaLabel={t.semesterType}
            options={(["HK1", "HK2", "HK3"] as const).map((value) => ({
              value,
              label: t[value],
            }))}
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className={primaryButton}>
            {t.applyFilter}
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => {
              setYear("");
              setType("");
              onClear();
            }}
          >
            <FilterX size={16} /> {t.clearFilter}
          </button>
        </div>
      </div>
    </form>
  );
}
