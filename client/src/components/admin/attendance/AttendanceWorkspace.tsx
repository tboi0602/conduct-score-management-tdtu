"use client";

import Link from "next/link";
import { Barcode, ChevronLeft, MapPin, QrCode, Radio, Save } from "lucide-react";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useAttendanceWorkspace } from "@/hooks/attendance/useAttendanceWorkspace";
import { attendanceMessages } from "@/i18n/attendance-messages";
import { formatDate } from "@/lib/event-form";
import type { AttendanceDirection } from "@/types/attendance";
import { AttendanceImportAction } from "@/components/admin/attendance/AttendanceImportAction";
import { AttendanceReconciliation } from "@/components/admin/attendance/AttendanceReconciliation";

export function AttendanceWorkspace({ eventId }: { eventId: string }) {
  const { locale } = useAdminTranslations();
  const t = attendanceMessages[locale];
  const state = useAttendanceWorkspace(eventId);
  if (state.eventQuery.isPending) return <PageLoadingSkeleton />;
  const event = state.eventQuery.data;
  if (!event) return null;
  const directionOptions = [
    { value: "CHECK_IN", label: t.checkIn },
    ...(event.checkInMode === "TWO_WAY" ? [{ value: "CHECK_OUT", label: t.checkOut }] : []),
  ];
  return (
    <section>
      <Link
        href="/admin/attendance"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#154a9b]"
      >
        <ChevronLeft size={17} />
        {t.title}
      </Link>
      <header className="relative mt-4 overflow-hidden rounded-[24px] border border-[#d9e3ee] bg-white p-6 shadow-[0_20px_48px_-40px_rgba(16,42,80,.6)]">
        <span className="absolute inset-y-0 left-0 w-1 bg-[#16856d]" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#154a9b]">
              {t.ongoing}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[#102a50]">{event.name}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-[#66758a]">
              <MapPin size={16} />
              {event.location}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {event.deliveryMode === "ONLINE" ? (
              <AttendanceImportAction eventId={eventId} checkInMode={event.checkInMode} />
            ) : null}
            <span className="rounded-xl bg-[#edf4fc] px-3 py-2 text-sm font-bold text-[#154a9b]">
              {event.registeredCount}/{event.capacity ?? "∞"}
            </span>
          </div>
        </div>
      </header>
      <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-5">
          <div className="rounded-[22px] border border-[#d9e3ee] bg-white p-5 shadow-[0_18px_42px_-38px_rgba(16,42,80,.55)]">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-[#102a50]">
                <QrCode size={19} />
                {t.session}
              </h2>
              {state.sessionQuery.data ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <Radio size={13} />
                  {t.ongoing}
                </span>
              ) : null}
            </div>
            <div className="mt-4">
              <CustomSelect
                ariaLabel={t.direction}
                placeholder={t.direction}
                value={state.direction}
                disabled={Boolean(state.sessionQuery.data)}
                onChange={(value) => state.setDirection(value as AttendanceDirection)}
                options={directionOptions}
              />
            </div>
            {state.sessionQuery.data && state.qrImage ? (
              <div className="mt-4 text-center">
                <img
                  src={state.qrImage}
                  alt="Event attendance QR"
                  className="mx-auto w-64 rounded-xl"
                />
                <p className="mt-2 text-xs text-[#66758a]">
                  {t.qrRefresh}:{" "}
                  {state.qrSecondsRemaining === null ? "—" : `${state.qrSecondsRemaining}s`}
                </p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => (state.sessionQuery.data ? state.close.mutate() : state.open.mutate())}
              disabled={state.open.isPending || state.close.isPending}
              className="mt-4 min-h-11 w-full rounded-xl bg-[#154a9b] px-4 text-sm font-bold text-white shadow-[0_10px_24px_-16px_rgba(21,74,155,.8)] transition hover:bg-[#103f85] active:scale-[.99] disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-50"
            >
              {state.sessionQuery.data
                ? t.closeSession
                : state.open.isPending
                  ? t.getLocation
                  : t.openSession}
            </button>
          </div>
          <div className="rounded-[22px] border border-[#d9e3ee] bg-white p-5 shadow-[0_18px_42px_-38px_rgba(16,42,80,.55)]">
            <h2 className="flex items-center gap-2 font-bold text-[#102a50]">
              <Barcode size={19} />
              {t.scanBarcode}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#66758a]">{t.scannerReady}</p>
            <input
              ref={state.barcode.inputRef}
              autoFocus
              autoComplete="off"
              disabled={state.scan.isPending}
              value={state.barcode.value}
              onChange={state.barcode.onChange}
              onKeyDown={state.barcode.onKeyDown}
              placeholder={t.enterCode}
              className="mt-4 h-12 w-full rounded-xl border border-[#cdd9e7] px-4 font-mono text-base font-semibold tracking-wide outline-none focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <CustomSelect
                ariaLabel={t.direction}
                placeholder={t.direction}
                value={state.direction}
                onChange={(value) => state.setDirection(value as AttendanceDirection)}
                options={directionOptions}
              />
              <CustomSelect
                ariaLabel={t.result}
                placeholder={t.result}
                value={state.attendanceStatus}
                onChange={(value) => state.setAttendanceStatus(value as "ATTENDED" | "LATE")}
                options={[
                  { value: "ATTENDED", label: t.attended },
                  { value: "LATE", label: t.late },
                ]}
              />
            </div>
            <p className="mt-3 text-xs text-[#718096]">{t.manualEnterHint}</p>
          </div>
        </div>
        <div className="rounded-[22px] border border-[#d9e3ee] bg-white p-5 shadow-[0_18px_42px_-38px_rgba(16,42,80,.55)]">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={state.searchTerm}
              onChange={(input) => state.updateSearchTerm(input.target.value)}
              placeholder={t.search}
              className="h-11 flex-1 rounded-xl border border-[#cdd9e7] px-3 text-sm"
            />
            <CustomSelect
              ariaLabel={t.result}
              placeholder={t.result}
              value={state.filterStatus}
              onChange={state.updateFilterStatus}
              options={[
                { value: "", label: t.all },
                { value: "PENDING", label: t.pending },
                { value: "ACCEPTED", label: t.accepted },
                { value: "REJECTED", label: t.rejected },
              ]}
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-[#718096]">
                <tr>
                  <th className="py-3">#</th>
                  <th>{t.student}</th>
                  <th>{t.direction}</th>
                  <th>{t.source}</th>
                  <th>{t.result}</th>
                  <th>{t.adjustStatus}</th>
                  <th>{t.time}</th>
                </tr>
              </thead>
              <tbody>
                {(state.requestsQuery.data?.data ?? []).map((item, index) => (
                  <tr key={item.id} className="border-b border-[#edf1f5]">
                    <td className="py-3">{(state.page - 1) * 20 + index + 1}</td>
                    <td>
                      <p className="font-semibold text-[#263b58]">{item.student.user.name}</p>
                      <p className="text-xs text-[#718096]">{item.student.studentCode}</p>
                    </td>
                    <td>{item.direction === "CHECK_IN" ? t.checkIn : t.checkOut}</td>
                    <td>{t[item.source]}</td>
                    <td>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${item.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-700" : item.status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.attendanceRecord ? (
                        <div className="flex min-w-52 items-center gap-2">
                          <CustomSelect
                            ariaLabel={t.adjustStatus}
                            placeholder={t.adjustStatus}
                            value={
                              state.recordStatuses[item.attendanceRecord.id] ??
                              item.attendanceRecord.status
                            }
                            onChange={(value) =>
                              state.updateRecordStatus(
                                item.attendanceRecord!.id,
                                value as "ATTENDED" | "LATE" | "ABSENT",
                              )
                            }
                            options={[
                              { value: "ATTENDED", label: t.attended },
                              { value: "LATE", label: t.late },
                              { value: "ABSENT", label: t.absent },
                            ]}
                          />
                          <button
                            type="button"
                            aria-label={t.saveStatus}
                            disabled={state.adjust.isPending}
                            onClick={() =>
                              state.adjust.mutate({
                                recordId: item.attendanceRecord!.id,
                                status:
                                  state.recordStatuses[item.attendanceRecord!.id] ??
                                  item.attendanceRecord!.status,
                              })
                            }
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#154a9b] text-white disabled:opacity-50"
                          >
                            <Save size={16} />
                          </button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{formatDate(item.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(state.requestsQuery.data?.pagination.totalPages ?? 0) > 1 ? (
            <PaginationControls
              pagination={state.requestsQuery.data!.pagination}
              onPageChange={state.setPage}
              disabled={state.requestsQuery.isFetching}
            />
          ) : null}
        </div>
      </div>
      <AttendanceReconciliation eventId={eventId} />
    </section>
  );
}
