"use client";

import { CalendarDays, ChevronDown, MapPin, Search, SlidersHorizontal, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Modal } from "@/components/ui/Modal";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { studentEventViews, useStudentEvents } from "@/hooks/events/useStudentEvents";
import { studentEventMessages } from "@/i18n/student-event-messages";
import { formatDate, organizerLabel } from "@/lib/event-form";
import type { EventType, PublicEvent, StudentEventFilters } from "@/types/events";

export function StudentEvents() {
  const { locale } = useLanguage();
  const t = studentEventMessages[locale];
  const state = useStudentEvents();

  if (state.query.isPending) return <PageLoadingSkeleton />;
  return (
    <section className="mx-auto max-w-7xl">
      <header className="border-b border-[#dfe7f0] pb-6">
        <div className="flex items-center gap-2.5">
          <span className="h-px w-7 bg-[#154a9b]" />
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#154a9b]">TDTU</p>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-[-.035em] text-[#102a50] sm:text-4xl">
          {t.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#60728a]">{t.description}</p>
      </header>
      <div className="mt-6 flex flex-col gap-3 rounded-[22px] border border-[#dae4ef] bg-white p-3 shadow-[0_18px_45px_-38px_rgba(16,42,80,.6)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-[#f1f5f9] p-1">
          {(["all", "recommended", "mine"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => state.selectTab(value)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold transition sm:flex-none ${state.tab === value ? "bg-white text-[#154a9b] shadow-[0_6px_18px_-12px_rgba(16,42,80,.7)]" : "text-[#60728a] hover:text-[#102a50]"}`}
            >
              {value === "all" ? t.all : value === "recommended" ? t.recommended : t.mine}
            </button>
          ))}
        </div>
        {state.tab !== "mine" ? (
          <label className="relative block sm:w-80">
            <Search className="absolute left-3 top-3 text-[#718096]" size={17} />
            <input
              value={state.term}
              onChange={(event) => state.updateTerm(event.target.value)}
              placeholder={t.search}
              aria-label={t.search}
              className="h-11 w-full rounded-xl border border-[#cdd9e7] bg-[#fbfcfe] pl-10 pr-3 text-sm outline-none transition focus:border-[#154a9b] focus:bg-white focus:ring-4 focus:ring-[#154a9b]/10"
            />
          </label>
        ) : (
          <div className="flex flex-wrap gap-2">
            {studentEventViews.map((value) => (
              <button
                key={value || "all"}
                type="button"
                onClick={() => state.selectView(value)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${state.view === value ? "bg-[#eaf2fc] text-[#154a9b]" : "text-[#66758a] hover:bg-[#f3f6fa]"}`}
              >
                {value === ""
                  ? t.viewAll
                  : value === "UPCOMING"
                    ? t.viewUpcoming
                    : value === "ATTENDED"
                      ? t.viewAttended
                      : value === "ABSENT"
                        ? t.viewAbsent
                        : t.viewCancelled}
              </button>
            ))}
          </div>
        )}
      </div>
      {state.tab !== "mine" ? (
        <button
          type="button"
          onClick={() => state.setFiltersOpen((value) => !value)}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#c8d5e5] bg-white px-4 text-sm font-bold text-[#314966] shadow-[0_10px_24px_-20px_rgba(16,42,80,.6)] transition hover:border-[#9fb6d2] hover:bg-[#f8faff] active:scale-[.98]"
        >
          <SlidersHorizontal size={17} />
          {t.filters}
          {Object.values(state.filters).filter(Boolean).length > 0 ? (
            <span className="rounded-full bg-[#154a9b] px-2 py-0.5 text-xs text-white">
              {Object.values(state.filters).filter(Boolean).length}
            </span>
          ) : null}
          <ChevronDown
            size={16}
            className={`transition ${state.filtersOpen ? "rotate-180" : ""}`}
          />
        </button>
      ) : null}
      {state.tab !== "mine" && state.filtersOpen ? (
        <div className="mt-4 rounded-[22px] border border-[#d9e3ee] bg-white p-4 shadow-[0_18px_45px_-38px_rgba(16,42,80,.6)] sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-[#263b58]">
              <SlidersHorizontal size={17} /> {t.filters}
            </p>
            <button
              type="button"
              onClick={state.clearFilters}
              className="text-xs font-semibold text-[#154a9b] hover:underline"
            >
              {t.clearFilters}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <CustomSelect
              ariaLabel={t.eventStatus}
              value={state.filters.status ?? ""}
              placeholder={t.allStatuses}
              onChange={(value) => {
                state.updateFilters((current) => ({
                  ...current,
                  status: (value || undefined) as StudentEventFilters["status"],
                }));
              }}
              options={[
                { value: "", label: t.allStatuses },
                { value: "UPCOMING", label: t.upcoming },
                { value: "ONGOING", label: t.ongoing },
                { value: "COMPLETED", label: t.completed },
              ]}
            />
            <CustomSelect
              ariaLabel={t.eventType}
              value={state.filters.type ?? ""}
              placeholder={t.allTypes}
              onChange={(value) => {
                state.updateFilters((current) => ({
                  ...current,
                  type: (value || undefined) as EventType | undefined,
                  organizerId: undefined,
                }));
              }}
              options={[
                { value: "", label: t.allTypes },
                { value: "UNIVERSITY", label: t.university },
                { value: "FACULTY", label: t.facultyType },
                { value: "CLASS", label: t.classType },
                { value: "CLUB", label: t.club },
              ]}
            />
            <div className="space-y-2">
              <label className="relative block">
                <Search className="absolute left-3 top-3 text-[#718096]" size={17} />
                <input
                  type="search"
                  value={state.organizerTerm}
                  onChange={(event) => state.setOrganizerTerm(event.target.value)}
                  placeholder={t.organizerSearch}
                  aria-label={t.organizerSearch}
                  maxLength={100}
                  className="h-11 w-full rounded-xl border border-[#cdd9e7] pl-10 pr-3 text-sm outline-none focus:border-[#154a9b]"
                />
              </label>
              {state.organizerTerm.trim().length > 0 && state.organizerTerm.trim().length < 3 ? (
                <p className="text-xs text-[#66758a]">{t.searchHint}</p>
              ) : null}
              <CustomSelect
                ariaLabel={t.organizerFilter}
                value={state.filters.organizerId ?? ""}
                placeholder={t.allOrganizers}
                disabled={state.organizers.isFetching}
                onChange={(value) => {
                  state.updateFilters((current) => ({
                    ...current,
                    organizerId: value || undefined,
                  }));
                }}
                options={[
                  { value: "", label: t.allOrganizers },
                  ...(state.organizers.data?.data ?? []).map((item) => ({
                    value: item.id,
                    label: organizerLabel(item),
                  })),
                ]}
              />
            </div>
          </div>
        </div>
      ) : null}
      {state.query.error ? (
        <p role="alert" className="mt-5 rounded-xl bg-[#fff1f2] p-4 text-sm text-[#b72e3f]">
          {t.loadError}
        </p>
      ) : null}
      {!state.query.error && state.items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-[#cad5e5] bg-white p-10 text-center text-[#66758a]">
          {t.noEvents}
        </p>
      ) : null}
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {state.items.map(({ event, participation }) => {
          const now = Date.now();
          const pending = now < new Date(event.registrationStart).getTime();
          const full = event.remainingSlots === 0;
          const lifecycle =
            now < new Date(event.timeStart).getTime()
              ? t.upcoming
              : now <= new Date(event.timeEnd).getTime()
                ? t.ongoing
                : t.completed;
          return (
            <article
              key={event.id}
              className="group relative flex min-h-72 flex-col overflow-hidden rounded-[24px] border border-[#d9e3ee] bg-white p-5 shadow-[0_20px_48px_-38px_rgba(16,42,80,.65)] transition duration-200 hover:-translate-y-1 hover:border-[#bfd0e3] hover:shadow-[0_26px_55px_-36px_rgba(16,42,80,.6)]"
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-[#154a9b] opacity-85" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-lg bg-[#edf4fc] px-2.5 py-1 text-xs font-bold text-[#154a9b]">
                    {event.points} {t.points}
                  </span>
                  <span className="rounded-lg bg-[#fff1f3] px-2.5 py-1 text-xs font-bold text-[#b42332]">
                    {lifecycle}
                  </span>
                  <span className="rounded-lg bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold text-[#52647d]">
                    {t[event.deliveryMode]}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#66758a]">
                  {participation === "ATTENDED"
                    ? t.attended
                    : participation === "ABSENT"
                      ? t.absent
                      : participation === "CANCELLED"
                        ? t.cancelled
                        : event.registrationStatus === "REGISTERED"
                          ? t.registered
                          : pending
                            ? t.registrationPending
                            : event.registrationOpen
                              ? t.registrationOpen
                              : t.registrationClosed}
                </span>
              </div>
              <h2 className="mt-4 line-clamp-2 text-xl font-bold leading-7 tracking-[-.02em] text-[#102a50] transition group-hover:text-[#154a9b]">
                {event.name}
              </h2>
              <p className="mt-2 text-sm text-[#66758a]">
                {event.organizer ? organizerLabel(event.organizer) : "TDTU"}
              </p>
              {event.descriptionPreview ? (
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#66758a]">
                  {event.descriptionPreview}
                </p>
              ) : null}
              <p className="mt-3 flex items-start gap-2 text-sm text-[#52647d]">
                <MapPin size={16} className="mt-0.5 shrink-0 text-[#154a9b]" />
                <span className="line-clamp-2">{event.location || t.locationPending}</span>
              </p>
              <p className="mt-4 flex items-center gap-2 text-sm text-[#52647d]">
                <CalendarDays size={16} /> {t.starts}: {formatDate(event.timeStart, locale)}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-[#52647d]">
                <CalendarDays size={16} /> {t.ends}: {formatDate(event.timeEnd, locale)}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-[#52647d]">
                <Users size={16} />{" "}
                {event.capacity === null ? t.unlimited : `${event.remainingSlots} ${t.remaining}`}
              </p>
              <div className="mt-auto flex gap-2 pt-5">
                <button
                  type="button"
                  onClick={() => state.setDetailId(event.id)}
                  className="flex-1 rounded-xl border border-[#c8d5e5] px-3 py-2.5 text-sm font-semibold text-[#52647d] transition hover:border-[#9fb6d2] hover:bg-[#f5f8fc] active:scale-[.98]"
                >
                  {t.details}
                </button>
                {event.registrationStatus === "REGISTERED" ? (
                  <button
                    type="button"
                    disabled={now > new Date(event.registrationEnd).getTime()}
                    onClick={() => state.setCancelling(event)}
                    className="flex-1 rounded-xl bg-[#fff0f1] px-3 py-2.5 text-sm font-bold text-[#bd3343] transition hover:bg-[#ffe5e8] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t.cancelRegistration}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!event.registrationOpen || full || state.register.isPending}
                    onClick={() => state.register.mutate(event.id)}
                    className="flex-1 rounded-xl bg-[#154a9b] px-3 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_-16px_rgba(21,74,155,.8)] transition hover:bg-[#103f85] active:scale-[.98] disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-40"
                  >
                    {full ? t.full : t.register}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {state.pagination.totalPages > 1 ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#dce4ef] bg-white">
          <PaginationControls
            pagination={state.pagination}
            onPageChange={state.setPage}
            disabled={state.query.isFetching}
          />
        </div>
      ) : null}
      <Modal
        open={Boolean(state.detailId)}
        onClose={() => state.setDetailId(null)}
        title={t.details}
      >
        {state.detailQuery.isPending ? (
          <div className="h-48 animate-pulse rounded-xl bg-[#edf2f7]" />
        ) : state.detailQuery.data ? (
          <EventDetail event={state.detailQuery.data} locale={locale} t={t} />
        ) : (
          <p className="text-sm text-[#b72e3f]">{t.loadError}</p>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(state.cancelling)}
        onClose={() => state.setCancelling(null)}
        onConfirm={() => state.cancelling && state.cancel.mutate(state.cancelling.id)}
        title={t.cancelRegistration}
        subject={state.cancelling?.name ?? ""}
        description={t.confirmCancel}
        pending={state.cancel.isPending}
      />
    </section>
  );
}

function EventDetail({
  event,
  locale,
  t,
}: {
  event: PublicEvent;
  locale: string;
  t: (typeof studentEventMessages)["vi"] | (typeof studentEventMessages)["en"];
}) {
  return (
    <div className="space-y-4 text-sm text-[#52647d]">
      <h2 className="text-xl font-bold text-[#102a50]">{event.name}</h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="font-semibold">{t.organizer}</dt>
          <dd>{event.organizer ? organizerLabel(event.organizer) : "TDTU"}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t.location}</dt>
          <dd>{event.location || t.locationPending}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t.criterion}</dt>
          <dd>{event.criteria.title}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t.starts}</dt>
          <dd>{formatDate(event.timeStart, locale)}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t.ends}</dt>
          <dd>{formatDate(event.timeEnd, locale)}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t.registrationTime}</dt>
          <dd>
            {formatDate(event.registrationStart, locale)} –{" "}
            {formatDate(event.registrationEnd, locale)}
          </dd>
        </div>
      </dl>
      {event.description ? (
        <div
          className="event-rich-content border-t border-[#e6ebf2] pt-4"
          dangerouslySetInnerHTML={{ __html: event.description }}
        />
      ) : null}
    </div>
  );
}
