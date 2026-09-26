"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { studentEventMessages } from "@/i18n/student-event-messages";
import { queryKeys } from "@/lib/query-keys";
import { eventRegistrationService } from "@/services/events";
import type { PaginatedResponse } from "@/types/admin";
import type { MyEventRegistration, PublicEvent, StudentEventFilters } from "@/types/events";

export type StudentEventTab = "all" | "recommended" | "mine";
export const studentEventViews = ["", "UPCOMING", "ATTENDED", "ABSENT", "CANCELLED"] as const;
type StudentEventView = (typeof studentEventViews)[number];

export function useStudentEvents() {
  const { locale } = useLanguage();
  const messages = studentEventMessages[locale];
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<StudentEventTab>("all");
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState("");
  const [organizerTerm, setOrganizerTerm] = useState("");
  const [filters, setFilters] = useState<StudentEventFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<StudentEventView>("");
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
  const recommendedQuery = useQuery({
    queryKey: [...queryKeys.studentEvents.recommended(appliedFilters), page],
    queryFn: () => eventRegistrationService.recommended(page, 12, appliedFilters),
    enabled: tab === "recommended",
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const detailQuery = useQuery({
    queryKey: queryKeys.studentEvents.detail(detailId ?? ""),
    queryFn: () => eventRegistrationService.detail(detailId!).then((response) => response.data),
    enabled: Boolean(detailId),
  });

  const reconcileMyEventQueries = (event: PublicEvent) => {
    const status = event.registrationStatus;
    if (status !== "REGISTERED" && status !== "CANCELLED") return;
    const cachedQueries = queryClient.getQueriesData<PaginatedResponse<MyEventRegistration>>({
      queryKey: queryKeys.studentEvents.mineAll,
    });

    for (const [key, current] of cachedQueries) {
      if (!current) continue;
      const queryView = String(key[3] ?? "");
      const cached = current.data.find((item) => item.event.id === event.id);
      const belongs =
        status === "REGISTERED"
          ? queryView === "" || queryView === "UPCOMING"
          : queryView === "CANCELLED";
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
      queryClient.setQueryData(key, {
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

  const reconcileEvent = (event: PublicEvent) => {
    queryClient.setQueryData(queryKeys.studentEvents.detail(event.id), event);
    queryClient.setQueriesData<PaginatedResponse<PublicEvent>>(
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

  const register = useMutation({
    mutationFn: (eventId: string) => eventRegistrationService.register(eventId),
    onSuccess: (response) => {
      reconcileEvent(response.data);
      showToast(messages.registerSuccess);
    },
    onError: () => showToast(messages.actionError, "error"),
  });
  const cancel = useMutation({
    mutationFn: (eventId: string) => eventRegistrationService.cancel(eventId),
    onSuccess: (response) => {
      reconcileEvent(response.data);
      setCancelling(null);
      showToast(messages.cancelSuccess);
    },
    onError: () => showToast(messages.actionError, "error"),
  });

  const query = tab === "all" ? listQuery : tab === "recommended" ? recommendedQuery : mineQuery;
  const pagination = query.data?.pagination ?? {
    page,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  const items: Array<{ event: PublicEvent; participation?: string }> =
    tab !== "mine"
      ? (tab === "all" ? (listQuery.data?.data ?? []) : (recommendedQuery.data?.data ?? [])).map(
          (event) => ({ event }),
        )
      : (mineQuery.data?.data ?? []).map((registration) => ({
          event: { ...registration.event, registrationStatus: registration.status },
          participation: registration.participationStatus,
        }));

  const selectTab = (value: StudentEventTab) => {
    setTab(value);
    setPage(1);
  };
  const selectView = (value: StudentEventView) => {
    setView(value);
    setPage(1);
  };
  const updateTerm = (value: string) => {
    setTerm(value);
    setPage(1);
  };
  const updateFilters = (update: (current: StudentEventFilters) => StudentEventFilters) => {
    setFilters(update);
    setPage(1);
  };
  const clearFilters = () => {
    setFilters({});
    setOrganizerTerm("");
    setPage(1);
  };

  return {
    locale,
    tab,
    selectTab,
    page,
    setPage,
    term,
    updateTerm,
    organizerTerm,
    setOrganizerTerm,
    filters,
    updateFilters,
    clearFilters,
    filtersOpen,
    setFiltersOpen,
    activeFilterCount: Object.values(filters).filter(Boolean).length,
    view,
    selectView,
    detailId,
    setDetailId,
    cancelling,
    setCancelling,
    organizers,
    detailQuery,
    query,
    pagination,
    items,
    register,
    cancel,
  };
}
