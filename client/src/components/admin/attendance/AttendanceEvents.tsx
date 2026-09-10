"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Radio, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";
import { attendanceMessages } from "@/i18n/attendance-messages";
import { queryKeys } from "@/lib/query-keys";
import { eventService } from "@/services/events";
import { formatDate } from "@/lib/event-form";
import { useState } from "react";
import { PaginationControls } from "@/components/admin/PaginationControls";

export function AttendanceEvents() {
  const { locale } = useAdminTranslations();
  const t = attendanceMessages[locale];
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [...queryKeys.attendance.events, page],
    queryFn: () => eventService.list(page, 12, { status: "ONGOING" }),
    staleTime: 15_000,
  });
  if (query.isPending) return <PageLoadingSkeleton />;
  return (
    <section>
      <AdminPageHeader eyebrow="TDTU" title={t.title} description={t.description} />
      {query.error ? (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{t.actionError}</p>
      ) : null}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {(query.data?.data ?? []).map((event) => (
          <article
            key={event.id}
            className="rounded-[22px] border border-[#dce4ef] bg-white p-5 shadow-[0_18px_45px_-32px_rgba(31,67,111,.42)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <Radio size={14} /> {t.ongoing}
                </span>
                <h2 className="mt-3 text-xl font-bold text-[#102a50]">{event.name}</h2>
              </div>
              <span className="rounded-lg bg-[#edf4fc] px-2.5 py-1 text-xs font-bold text-[#154a9b]">
                {event.registeredCount}/{event.capacity ?? "∞"}
              </span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-[#52647d]">
              <p className="flex items-center gap-2">
                <CalendarDays size={16} />
                {formatDate(event.timeStart, locale)}
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={16} />
                {event.location}
              </p>
              <p className="flex items-center gap-2">
                <Users size={16} />
                {event.registeredCount}
              </p>
            </div>
            <Link
              href={`/admin/attendance/${event.id}`}
              className="mt-5 inline-flex rounded-xl bg-[#154a9b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#103f87]"
            >
              {t.manage}
            </Link>
          </article>
        ))}
      </div>
      {(query.data?.pagination.totalPages ?? 0) > 1 ? (
        <PaginationControls
          pagination={query.data!.pagination}
          onPageChange={setPage}
          disabled={query.isFetching}
        />
      ) : null}
      {!query.error && (query.data?.data.length ?? 0) === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-[#cad5e5] bg-white p-10 text-center text-sm text-[#66758a]">
          {t.noOngoing}
        </p>
      ) : null}
    </section>
  );
}
