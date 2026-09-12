"use client";

import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { managementError } from "@/lib/event-form";

export function ManagementError({
  error,
  fallback,
  retry,
}: {
  error: unknown;
  fallback: string;
  retry?: () => void;
}) {
  const { t } = useAdminTranslations();
  if (!error) return null;
  return (
    <div role="alert" className="rounded-xl bg-[#fff1f2] px-4 py-3 text-sm text-[#b72e3f]">
      <p>{managementError(error, t, fallback)}</p>
      {retry ? (
        <button
          type="button"
          onClick={retry}
          className="mt-2 font-semibold underline underline-offset-4"
        >
          {t.retry}
        </button>
      ) : null}
    </div>
  );
}

export function ManagementNotice({ notice }: { notice: "saved" | "deleted" | null }) {
  const { t } = useAdminTranslations();
  return notice ? (
    <p role="status" className="mt-5 rounded-xl bg-[#edf4fc] px-4 py-3 text-sm text-[#154a9b]">
      {t[notice]}
    </p>
  ) : null;
}
