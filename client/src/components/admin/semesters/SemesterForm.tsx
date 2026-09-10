"use client";

import { useState, type FormEvent } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ManagementError } from "@/components/admin/ManagementFeedback";
import { inputClass, primaryButton, secondaryButton } from "@/components/admin/management-styles";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";
import type { Semester, SemesterType } from "@/types/events";

export function SemesterForm({
  semester,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  semester: Semester | null;
  saving: boolean;
  error: unknown;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const { t } = useAdminTranslations();
  const [type, setType] = useState<SemesterType>(semester?.type ?? "HK1");
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <fieldset disabled={saving} className="space-y-5">
        <label className="block text-sm font-semibold text-[#263b58]">
          {t.year}
          <input
            name="year"
            type="number"
            min={2000}
            max={2100}
            step={1}
            required
            autoFocus
            defaultValue={semester?.year ?? new Date().getFullYear()}
            className={inputClass}
          />
        </label>
        <div className="space-y-2 text-sm font-semibold text-[#263b58]">
          <p>{t.semesterType}</p>
          <CustomSelect
            name="type"
            value={type}
            onChange={(value) => setType(value as SemesterType)}
            placeholder={t.selectSemesterType}
            ariaLabel={t.semesterType}
            options={(["HK1", "HK2", "HK3"] as const).map((value) => ({
              value,
              label: t[value],
            }))}
          />
        </div>
      </fieldset>
      <ManagementError error={error} fallback={t.saveError} />
      <div className="flex justify-end gap-3 border-t border-[#e6ebf2] pt-5">
        <button type="button" onClick={onCancel} disabled={saving} className={secondaryButton}>
          {t.cancel}
        </button>
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? t.saving : t.save}
        </button>
      </div>
    </form>
  );
}
