"use client";

import Link from "next/link";
import { GitCompareArrows, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useAttendanceReconciliation } from "@/hooks/attendance/useAttendanceReconciliation";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { attendanceMessages } from "@/i18n/attendance-messages";
import type { AttendanceReconciliationState } from "@/types/attendance";

export function AttendanceReconciliation({ eventId }: { eventId: string }) {
  const { locale } = useAdminTranslations();
  const t = attendanceMessages[locale];
  const state = useAttendanceReconciliation(eventId);
  const [notes, setNotes] = useState<Record<string, string>>({});
  return (
    <section className="mt-6 rounded-[22px] border border-[#d9e3ee] bg-white p-5 shadow-[0_18px_42px_-38px_rgba(16,42,80,.55)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-[#102a50]">
            <GitCompareArrows size={19} />
            {t.reconciliationTitle}
          </h2>
          <p className="mt-1 text-sm text-[#66758a]">{t.reconciliationDescription}</p>
        </div>
        <Link href="/admin/appeals" className="text-sm font-bold text-[#154a9b]">
          {t.openAppeals}
        </Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <input
          value={state.searchTerm}
          onChange={(event) => state.setSearchTerm(event.target.value)}
          placeholder={t.reconciliationSearch}
          className="min-h-11 rounded-xl border border-[#cdd9e7] px-3 text-sm outline-none focus:border-[#154a9b]"
        />
        <CustomSelect
          ariaLabel={t.reconciliationState}
          value={state.state}
          placeholder={t.reconciliationState}
          onChange={(value) => state.setState(value as AttendanceReconciliationState | "")}
          options={[
            { value: "", label: t.all },
            { value: "MATCHED", label: t.matched },
            { value: "CLIENT_ONLY", label: t.clientOnly },
            { value: "SERVER_ONLY", label: t.serverOnly },
            { value: "RESOLVED", label: t.resolved },
          ]}
        />
      </div>
      <div className="mt-4 space-y-3">
        {(state.query.data?.data ?? []).map((item) => (
          <article
            key={`${item.clientAttemptId}-${item.incidentId ?? item.auditId}`}
            className="grid gap-4 rounded-2xl border border-[#e0e7ef] p-4 lg:grid-cols-2"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#154a9b]">
                {t.clientIncident}
              </p>
              <p className="mt-2 font-bold text-[#263b58]">
                {item.studentCode ?? t.unknownStudent} · {item.studentName ?? "—"}
              </p>
              <p className="mt-1 break-all text-xs text-[#66758a]">{item.clientAttemptId}</p>
              <p className="mt-2 text-sm text-[#52647d]">
                {item.failureCategory ?? t.noClientIncident}
              </p>
              {item.digest ? (
                <p className="mt-1 break-all text-xs text-[#8090a4]">SHA-256: {item.digest}</p>
              ) : null}
            </div>
            <div className="border-t border-[#e6ebf1] pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#154a9b]">
                <ShieldCheck size={15} />
                {t.serverAudit}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm text-[#52647d]">
                <dt>{t.httpStatus}</dt>
                <dd className="font-bold">{item.httpStatus ?? "—"}</dd>
                <dt>{t.workerResult}</dt>
                <dd className="font-bold">{item.scanStatus ?? "—"}</dd>
                <dt>{t.attendanceResult}</dt>
                <dd className="font-bold">{item.attendanceStatus ?? "—"}</dd>
                <dt>{t.instance}</dt>
                <dd className="truncate font-bold">{item.instance ?? "—"}</dd>
              </dl>
              {item.incidentId && item.incidentStatus !== "RESOLVED" ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={notes[item.incidentId] ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [item.incidentId!]: event.target.value,
                      }))
                    }
                    maxLength={1000}
                    placeholder={t.resolutionNote}
                    className="min-h-10 flex-1 rounded-lg border border-[#cdd9e7] px-3 text-xs outline-none focus:border-[#154a9b]"
                  />
                  <button
                    type="button"
                    disabled={!notes[item.incidentId]?.trim() || state.resolve.isPending}
                    onClick={() =>
                      state.resolve.mutate({
                        incidentId: item.incidentId!,
                        note: notes[item.incidentId!].trim(),
                      })
                    }
                    className="rounded-lg bg-[#154a9b] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {t.markResolved}
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
        {!state.query.isPending && !state.query.data?.data.length ? (
          <p className="py-6 text-center text-sm text-[#718096]">{t.noReconciliation}</p>
        ) : null}
      </div>
      {(state.query.data?.pagination.totalPages ?? 0) > 1 ? (
        <PaginationControls
          pagination={state.query.data!.pagination}
          onPageChange={state.setPage}
          disabled={state.query.isFetching}
        />
      ) : null}
    </section>
  );
}
