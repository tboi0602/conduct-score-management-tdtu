"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ManagementTable } from "@/components/admin/ManagementTable";
import { primaryButton } from "@/components/admin/management-styles";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/event-form";
import { queryKeys } from "@/lib/query-keys";
import { eventRegistrationService } from "@/services/events";
import type { EventRegistration, ManagedEvent, StudentOption } from "@/types/events";

export function EventRegistrations({ event }: { event: ManagedEvent }) {
  const { t, locale } = useAdminTranslations();
  const { showToast } = useToast();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [studentTerm, setStudentTerm] = useState("");
  const [cancelTarget, setCancelTarget] = useState<EventRegistration | null>(null);
  const search = useDebounce(term.trim(), 500);
  const studentSearch = useDebounce(studentTerm.trim(), 500);
  const query = useQuery({
    queryKey: [...queryKeys.events.registrations(event.id, search, status), page],
    queryFn: () =>
      eventRegistrationService.managed(
        event.id,
        page,
        20,
        search.length >= 3 ? search : undefined,
        status || undefined,
      ),
    placeholderData: keepPreviousData,
  });
  const students = useQuery({
    queryKey: queryKeys.events.studentOptions(event.id, studentSearch),
    queryFn: () =>
      eventRegistrationService.students(
        event.id,
        1,
        studentSearch.length >= 3 ? studentSearch : undefined,
      ),
    enabled: adding,
    staleTime: 30_000,
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["admin", "events", event.id, "registrations"] });
    await client.invalidateQueries({ queryKey: queryKeys.events.all });
  };
  const add = useMutation({
    mutationFn: (studentId: string) =>
      eventRegistrationService.registerStudent(event.id, studentId),
    onSuccess: async () => {
      setCancelTarget(null);
      setAdding(false);
      showToast(t.registrationSaved);
      await refresh();
    },
    onError: () => showToast(t.registrationFailed, "error"),
  });
  const cancel = useMutation({
    mutationFn: (studentId: string) => eventRegistrationService.cancelStudent(event.id, studentId),
    onSuccess: async () => {
      setCancelTarget(null);
      showToast(t.registrationSaved);
      await refresh();
    },
    onError: () => showToast(t.registrationFailed, "error"),
  });
  const pagination = query.data?.pagination ?? {
    page,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };
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
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setPage(1);
            }}
            placeholder={t.registrationSearch}
            aria-label={t.registrationSearch}
            className="h-11 w-full rounded-xl border border-[#cdd9e7] pl-10 pr-3 text-sm outline-none focus:border-[#154a9b]"
          />
        </label>
        <div className="w-full sm:w-52">
          <CustomSelect
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
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
        <button type="button" onClick={() => setAdding(true)} className={primaryButton}>
          <UserPlus size={17} />
          {t.addStudent}
        </button>
      </div>
      <ManagementTable
        headers={[t.studentCode, t.fullName, t.registrationStatus, t.registeredAt, t.actions]}
        loading={query.isPending}
        fetching={query.isFetching}
        error={query.error}
        count={query.data?.data.length ?? 0}
        pagination={pagination}
        onPageChange={setPage}
        retry={() => void query.refetch()}
      >
        {(query.data?.data ?? []).map((item) => (
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
                  disabled={cancel.isPending}
                  onClick={() => setCancelTarget(item)}
                >
                  <X size={16} />
                </IconButton>
              ) : null}
            </td>
          </tr>
        ))}
      </ManagementTable>
      <Modal open={adding} onClose={() => setAdding(false)} title={t.selectStudent} size="md">
        <input
          value={studentTerm}
          onChange={(e) => setStudentTerm(e.target.value)}
          placeholder={t.registrationSearch}
          aria-label={t.registrationSearch}
          className="h-11 w-full rounded-xl border border-[#cdd9e7] px-3 text-sm outline-none focus:border-[#154a9b]"
        />
        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {(students.data?.data ?? []).map((student: StudentOption) => (
            <button
              key={student.id}
              type="button"
              disabled={add.isPending}
              onClick={() => add.mutate(student.id)}
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
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancel.mutate(cancelTarget.student.id)}
        title={t.cancel}
        subject={cancelTarget?.student.user.name ?? ""}
        pending={cancel.isPending}
      />
    </section>
  );
}
