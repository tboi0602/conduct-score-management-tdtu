"use client";

import type { FormEvent } from "react";
import { ManagementError } from "@/components/admin/ManagementFeedback";
import { inputClass, primaryButton, secondaryButton } from "@/components/admin/management-styles";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import type { Criteria } from "@/types/events";

export function CriteriaForm({
  criterion,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  criterion: Criteria | null;
  saving: boolean;
  error: unknown;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const { t } = useAdminTranslations();
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <fieldset disabled={saving} className="space-y-5">
        <label className="block text-sm font-semibold text-[#263b58]">
          {t.criteriaName}
          <input
            name="title"
            required
            maxLength={255}
            autoFocus
            defaultValue={criterion?.title ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-semibold text-[#263b58]">
          {t.maxPoints}
          <input
            name="maxPoints"
            type="number"
            min={0}
            max={2147483647}
            step={1}
            required
            defaultValue={criterion?.maxPoints ?? 0}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-semibold text-[#263b58]">
          {t.defaultPoints}
          <input
            name="defaultPoints"
            type="number"
            min={0}
            max={2147483647}
            step={1}
            required
            defaultValue={criterion?.defaultPoints ?? 0}
            className={inputClass}
          />
        </label>
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
