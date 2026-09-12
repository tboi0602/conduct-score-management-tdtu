"use client";

import { ArrowLeft, Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { ManagementTable } from "@/components/admin/ManagementTable";
import { primaryButton } from "@/components/admin/management-styles";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useEventRegistrations } from "@/hooks/events/useEventRegistrations";
import { formatDate } from "@/lib/event-form";
import type { ManagedEvent, StudentOption } from "@/types/events";

export function EventRegistrations({ event }: { event: ManagedEvent }) {
  const { t, locale } = useAdminTranslations();
  const state = useEventRegistrations(event.id);
  return (
    <section className="mx-auto max-w-7xl">
      <Link
        href="/admin/events"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#154a9b] hover:underline"
      >
        <ArrowLeft size={17} /> {t.backToEvents}
      </Link>
      <div className="mb-6 rounded-[22px] border border-[#dce4ef] bg-white p-5 shadow-[0_18px_45px_-32px_rgba(31,67,111,.42)]">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-[#154a9b]">
          {t.registrations}
        </p>
        <h1 className="mt-2 break-words text-2xl font-bold text-[#102a50]">{event.name}</h1>
        <p className="mt-2 text-sm text-[#66758a]">
          {event.registeredCount}
          {event.capacity === null ? ` · ${t.unlimited}` : `/${event.capacity}`}
        </p>
      </div>
      {event.capacity !== null && event.registeredCount > event.capacity ? (
        <p className="mb-4 rounded-xl bg-[#fff7e8] p-3 text-sm font-semibold text-[#9a6412]">
          {t.overCapacity}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search size={17} className="absolute left-3 top-3 text-[#718096]" />
          <input
            value={state.term}
            onChange={(e) => state.updateTerm(e.target.value)}
            placeholder={t.registrationSearch}
            aria-label={t.registrationSearch}
            className="h-11 w-full rounded-xl border border-[#cdd9e7] pl-10 pr-3 text-sm outline-none focus:border-[#154a9b]"
          />
        </label>
        <div className="w-full sm:w-52">
          <CustomSelect
            value={state.status}
            onChange={state.updateStatus}
            ariaLabel={t.registrationStatus}
            placeholder={t.allRegistrationStatuses}
            options={[
              { value: "", label: t.allRegistrationStatuses },
              ...(["REGISTERED", "CANCELLED", "ATTENDED", "ABSENT"] as const).map((value) => ({
                value,
                label: t[value],
              })),
            ]}
          />
        </div>
        <button type="button" onClick={() => state.setAdding(true)} className={primaryButton}>
          <UserPlus size={17} />
          {t.addStudent}
        </button>
      </div>
      <ManagementTable
        headers={[t.studentCode, t.fullName, t.registrationStatus, t.registeredAt, t.actions]}
        loading={state.registrations.isPending}
        fetching={state.registrations.isFetching}
        error={state.registrations.error}
        count={state.registrations.data?.data.length ?? 0}
        pagination={state.pagination}
        onPageChange={state.setPage}
        retry={() => void state.registrations.refetch()}
      >
        {(state.registrations.data?.data ?? []).map((item) => (
          <tr key={item.id}>
            <td className="px-5 py-4 font-semibold text-[#154a9b]">{item.student.studentCode}</td>
            <td className="px-5 py-4">
              <p className="font-semibold text-[#102a50]">{item.student.user.name}</p>
              <p className="text-xs text-[#66758a]">{item.student.user.email}</p>
            </td>
            <td className="px-5 py-4">{t[item.participationStatus]}</td>
            <td className="whitespace-nowrap px-5 py-4">{formatDate(item.registeredAt, locale)}</td>
            <td className="px-5 py-4 text-right">
              {item.status === "REGISTERED" ? (
                <IconButton
                  label={t.cancel}
                  tone="danger"
                  disabled={state.cancel.isPending}
                  onClick={() => state.setCancelTarget(item)}
                >
                  <X size={16} />
                </IconButton>
              ) : null}
            </td>
          </tr>
        ))}
      </ManagementTable>
      <Modal
        open={state.adding}
        onClose={() => state.setAdding(false)}
        title={t.selectStudent}
        size="md"
      >
        <input
          value={state.studentTerm}
          onChange={(e) => state.setStudentTerm(e.target.value)}
          placeholder={t.registrationSearch}
          aria-label={t.registrationSearch}
          className="h-11 w-full rounded-xl border border-[#cdd9e7] px-3 text-sm outline-none focus:border-[#154a9b]"
        />
        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {(state.students.data?.data ?? []).map((student: StudentOption) => (
            <button
              key={student.id}
              type="button"
              disabled={state.add.isPending}
              onClick={() => state.add.mutate(student.id)}
              className="flex w-full items-center justify-between rounded-xl border border-[#dce4ef] p-3 text-left hover:bg-[#f3f6fa]"
            >
              <span>
                <strong className="block text-sm text-[#102a50]">{student.user.name}</strong>
                <span className="text-xs text-[#66758a]">
                  {student.studentCode} · {student.user.email}
                </span>
              </span>
              <UserPlus size={17} className="text-[#154a9b]" />
            </button>
          ))}
        </div>
      </Modal>
      <ConfirmDialog
        open={Boolean(state.cancelTarget)}
        onClose={() => state.setCancelTarget(null)}
        onConfirm={() => state.cancelTarget && state.cancel.mutate(state.cancelTarget.student.id)}
        title={t.cancel}
        subject={state.cancelTarget?.student.user.name ?? ""}
        pending={state.cancel.isPending}
      />
    </section>
  );
}
