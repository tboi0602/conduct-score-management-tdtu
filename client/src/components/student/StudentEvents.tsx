"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, MapPin, Search, SlidersHorizontal, Users } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Modal } from "@/components/ui/Modal";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { useDebounce } from "@/hooks/useDebounce";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { studentEventMessages } from "@/i18n/student-event-messages";
import { formatDate, organizerLabel } from "@/lib/event-form";
import { queryKeys } from "@/lib/query-keys";
import { eventRegistrationService } from "@/services/events";
import type {
  EventType,
  MyEventRegistration,
  PublicEvent,
  StudentEventFilters,
} from "@/types/events";
import type { PaginatedResponse } from "@/types/admin";

type Tab = "all" | "mine";
const views = ["", "UPCOMING", "ATTENDED", "ABSENT", "CANCELLED"] as const;

export function StudentEvents() {
  const { locale } = useLanguage();
  const t = studentEventMessages[locale];
  const { showToast } = useToast();
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState("");
  const [organizerTerm, setOrganizerTerm] = useState("");
  const [filters, setFilters] = useState<StudentEventFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<(typeof views)[number]>("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<PublicEvent | null>(null);
  const search = useDebounce(term.trim(), 500);
  const organizerSearch = useDebounce(organizerTerm.trim(), 500);
  const appliedOrganizerSearch = organizerSearch.length >= 3 ? organizerSearch : undefined;
  const appliedFilters = { ...filters, search: search.length >= 3 ? search : undefined };
  const organizers = useQuery({
    queryKey: queryKeys.studentEvents.organizerOptions(filters.type, appliedOrganizerSearch),
    queryFn: () => eventRegistrationService.organizerOptions(filters.type, appliedOrganizerSearch),
    staleTime: 5 * 60_000,
  });
  const listQuery = useQuery({
    queryKey: [...queryKeys.studentEvents.list(appliedFilters), page],
    queryFn: () => eventRegistrationService.discover(page, 12, appliedFilters),
    enabled: tab === "all",
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const mineQuery = useQuery({
    queryKey: [...queryKeys.studentEvents.mine(view), page],
    queryFn: () => eventRegistrationService.mine(page, 12, view || undefined),
    enabled: tab === "mine",
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const detailQuery = useQuery({
    queryKey: queryKeys.studentEvents.detail(detailId ?? ""),
    queryFn: () => eventRegistrationService.detail(detailId!).then((response) => response.data),
    enabled: Boolean(detailId),
  });
  const reconcileEvent = (event: PublicEvent) => {
    client.setQueryData(queryKeys.studentEvents.detail(event.id), event);
    client.setQueriesData<PaginatedResponse<PublicEvent>>(
      { queryKey: queryKeys.studentEvents.listAll },
      (current) =>
        current
          ? {
              ...current,
              data: current.data.map((item) => (item.id === event.id ? event : item)),
            }
          : current,
    );
    reconcileMyEventQueries(event);
  };
  const reconcileMyEventQueries = (event: PublicEvent) => {
    const status = event.registrationStatus;
    if (status !== "REGISTERED" && status !== "CANCELLED") return;
    const cachedQueries = client.getQueriesData<PaginatedResponse<MyEventRegistration>>({
      queryKey: queryKeys.studentEvents.mineAll,
    });
    for (const [key, current] of cachedQueries) {
      if (!current) continue;
      const view = String(key[3] ?? "");
      const cached = current.data.find((item) => item.event.id === event.id);
      const belongs =
        status === "REGISTERED"
          ? view === "" || view === "UPCOMING"
          : status === "CANCELLED" && view === "CANCELLED";
      let data = current.data;
      let total = current.pagination.total;
      if (cached && belongs) {
        data = current.data.map((item) =>
          item.event.id === event.id
            ? {
                ...item,
                status,
                cancelledAt: status === "CANCELLED" ? new Date().toISOString() : null,
                participationStatus: (status === "CANCELLED"
                  ? "CANCELLED"
                  : "UPCOMING") as MyEventRegistration["participationStatus"],
                event,
              }
            : item,
        );
      } else if (cached && !belongs) {
        data = current.data.filter((item) => item.event.id !== event.id);
        total = Math.max(0, total - 1);
      } else if (!cached && belongs) {
        total += 1;
        if (current.pagination.page === 1) {
          const now = new Date().toISOString();
          data = [
            {
              id: `event-registration:${event.id}`,
              status,
              registeredAt: now,
              cancelledAt: status === "CANCELLED" ? now : null,
              participationStatus: (status === "CANCELLED"
                ? "CANCELLED"
                : "UPCOMING") as MyEventRegistration["participationStatus"],
              event,
            },
            ...current.data,
          ].slice(0, current.pagination.limit);
        }
      }
      const totalPages = Math.ceil(total / current.pagination.limit);
      client.setQueryData(key, {
        ...current,
        data,
        pagination: {
          ...current.pagination,
          total,
          totalPages,
          hasNextPage: current.pagination.page < totalPages,
        },
      });
    }
  };
  const register = useMutation({
    mutationFn: (eventId: string) => eventRegistrationService.register(eventId),
    onSuccess: (response) => {
      reconcileEvent(response.data);
      showToast(t.registerSuccess);
    },
    onError: () => showToast(t.actionError, "error"),
  });
  const cancel = useMutation({
    mutationFn: (eventId: string) => eventRegistrationService.cancel(eventId),
    onSuccess: (response) => {
      reconcileEvent(response.data);
      setCancelling(null);
      showToast(t.cancelSuccess);
    },
    onError: () => showToast(t.actionError, "error"),
  });
  const query = tab === "all" ? listQuery : mineQuery;
  const pagination = query.data?.pagination ?? {
    page,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  const items: Array<{ event: PublicEvent; participation?: string }> =
    tab === "all"
      ? (listQuery.data?.data ?? []).map((event) => ({ event }))
      : (mineQuery.data?.data ?? []).map((registration: MyEventRegistration) => ({
          event: { ...registration.event, registrationStatus: registration.status },
          participation: registration.participationStatus,
        }));

  if (query.isPending) return <PageLoadingSkeleton />;
  return (
    <section className="mx-auto max-w-7xl">
      <p className="text-xs font-bold tracking-[.14em] text-[#154a9b]">TDTU</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102a50]">{t.title}</h1>
      <p className="mt-2 text-sm text-[#66758a]">{t.description}</p>
      <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-[#dce4ef] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(["all", "mine"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTab(value);
                setPage(1);
              }}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === value ? "bg-[#154a9b] text-white" : "text-[#52647d] hover:bg-[#f3f6fa]"}`}
            >
              {value === "all" ? t.all : t.mine}
            </button>
          ))}
        </div>
        {tab === "all" ? (
          <label className="relative block sm:w-80">
            <Search className="absolute left-3 top-3 text-[#718096]" size={17} />
            <input
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setPage(1);
              }}
              placeholder={t.search}
              aria-label={t.search}
              className="h-11 w-full rounded-xl border border-[#cdd9e7] pl-10 pr-3 text-sm outline-none focus:border-[#154a9b]"
            />
          </label>
        ) : (
          <div className="flex flex-wrap gap-2">
            {views.map((value) => (
              <button
                key={value || "all"}
                type="button"
                onClick={() => {
                  setView(value);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === value ? "bg-[#eaf2fc] text-[#154a9b]" : "text-[#66758a] hover:bg-[#f3f6fa]"}`}
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
      {tab === "all" ? (
        <button
          type="button"
          onClick={() => setFiltersOpen((value) => !value)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#cdd9e7] bg-white px-4 py-2.5 text-sm font-bold text-[#263b58]"
        >
          <SlidersHorizontal size={17} />
          {t.filters}
          {Object.values(filters).filter(Boolean).length > 0 ? (
            <span className="rounded-full bg-[#154a9b] px-2 py-0.5 text-xs text-white">
              {Object.values(filters).filter(Boolean).length}
            </span>
          ) : null}
          <ChevronDown size={16} className={`transition ${filtersOpen ? "rotate-180" : ""}`} />
        </button>
      ) : null}
      {tab === "all" && filtersOpen ? (
        <div className="mt-4 rounded-2xl border border-[#dce4ef] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-[#263b58]">
              <SlidersHorizontal size={17} /> {t.filters}
            </p>
            <button
              type="button"
              onClick={() => {
                setFilters({});
                setOrganizerTerm("");
                setPage(1);
              }}
              className="text-xs font-semibold text-[#154a9b] hover:underline"
            >
              {t.clearFilters}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <CustomSelect
              ariaLabel={t.eventStatus}
              value={filters.status ?? ""}
              placeholder={t.allStatuses}
              onChange={(value) => {
                setFilters((current) => ({
                  ...current,
                  status: (value || undefined) as StudentEventFilters["status"],
                }));
                setPage(1);
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
              value={filters.type ?? ""}
              placeholder={t.allTypes}
              onChange={(value) => {
                setFilters((current) => ({
                  ...current,
                  type: (value || undefined) as EventType | undefined,
                  organizerId: undefined,
                }));
                setPage(1);
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
                  value={organizerTerm}
                  onChange={(event) => setOrganizerTerm(event.target.value)}
                  placeholder={t.organizerSearch}
                  aria-label={t.organizerSearch}
                  maxLength={100}
                  className="h-11 w-full rounded-xl border border-[#cdd9e7] pl-10 pr-3 text-sm outline-none focus:border-[#154a9b]"
                />
              </label>
              {organizerTerm.trim().length > 0 && organizerTerm.trim().length < 3 ? (
                <p className="text-xs text-[#66758a]">{t.searchHint}</p>
              ) : null}
              <CustomSelect
                ariaLabel={t.organizerFilter}
                value={filters.organizerId ?? ""}
                placeholder={t.allOrganizers}
                disabled={organizers.isFetching}
                onChange={(value) => {
                  setFilters((current) => ({ ...current, organizerId: value || undefined }));
                  setPage(1);
                }}
                options={[
                  { value: "", label: t.allOrganizers },
                  ...(organizers.data?.data ?? []).map((item) => ({
                    value: item.id,
                    label: organizerLabel(item),
                  })),
                ]}
              />
            </div>
          </div>
        </div>
      ) : null}
      {query.error ? (
        <p role="alert" className="mt-5 rounded-xl bg-[#fff1f2] p-4 text-sm text-[#b72e3f]">
          {t.loadError}
        </p>
      ) : null}
      {!query.error && items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-[#cad5e5] bg-white p-10 text-center text-[#66758a]">
          {t.noEvents}
        </p>
      ) : null}
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map(({ event, participation }) => {
          const now = Date.now();
          const pending = now < new Date(event.registrationStart).getTime();
          const full = event.remainingSlots === 0;
          return (
            <article
              key={event.id}
              className="flex min-h-72 flex-col rounded-[22px] border border-[#dce4ef] bg-white p-5 shadow-[0_18px_42px_-32px_rgba(31,67,111,.5)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-lg bg-[#edf4fc] px-2.5 py-1 text-xs font-bold text-[#154a9b]">
                  {event.points} {t.points}
                </span>
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
              <h2 className="mt-4 line-clamp-2 text-lg font-bold text-[#102a50]">{event.name}</h2>
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
                <CalendarDays size={16} /> {formatDate(event.timeStart, locale)}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-[#52647d]">
                <Users size={16} />{" "}
                {event.capacity === null ? t.unlimited : `${event.remainingSlots} ${t.remaining}`}
              </p>
              <div className="mt-auto flex gap-2 pt-5">
                <button
                  type="button"
                  onClick={() => setDetailId(event.id)}
                  className="flex-1 rounded-xl border border-[#cdd9e7] px-3 py-2.5 text-sm font-semibold text-[#52647d] hover:bg-[#f3f6fa]"
                >
                  {t.details}
                </button>
                {event.registrationStatus === "REGISTERED" ? (
                  <button
                    type="button"
                    disabled={now > new Date(event.registrationEnd).getTime()}
                    onClick={() => setCancelling(event)}
                    className="flex-1 rounded-xl bg-[#fff0f1] px-3 py-2.5 text-sm font-bold text-[#bd3343] disabled:opacity-40"
                  >
                    {t.cancelRegistration}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!event.registrationOpen || full || register.isPending}
                    onClick={() => register.mutate(event.id)}
                    className="flex-1 rounded-xl bg-[#154a9b] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                  >
                    {full ? t.full : t.register}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {pagination.totalPages > 1 ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#dce4ef] bg-white">
          <PaginationControls
            pagination={pagination}
            onPageChange={setPage}
            disabled={query.isFetching}
          />
        </div>
      ) : null}
      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title={t.details}>
        {detailQuery.isPending ? (
          <div className="h-48 animate-pulse rounded-xl bg-[#edf2f7]" />
        ) : detailQuery.data ? (
          <EventDetail event={detailQuery.data} locale={locale} t={t} />
        ) : (
          <p className="text-sm text-[#b72e3f]">{t.loadError}</p>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={() => cancelling && cancel.mutate(cancelling.id)}
        title={t.cancelRegistration}
        subject={cancelling?.name ?? ""}
        description={t.confirmCancel}
        pending={cancel.isPending}
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
