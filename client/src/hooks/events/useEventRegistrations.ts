"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { queryKeys } from "@/lib/query-keys";
import { eventRegistrationService } from "@/services/events";
import type { EventRegistration } from "@/types/events";

export function useEventRegistrations(eventId: string) {
  const { t } = useAdminTranslations();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [studentTerm, setStudentTerm] = useState("");
  const [cancelTarget, setCancelTarget] = useState<EventRegistration | null>(null);
  const search = useDebounce(term.trim(), 500);
  const studentSearch = useDebounce(studentTerm.trim(), 500);

  const registrations = useQuery({
    queryKey: [...queryKeys.events.registrations(eventId, search, status), page],
    queryFn: () =>
      eventRegistrationService.managed(
        eventId,
        page,
        20,
        search.length >= 3 ? search : undefined,
        status || undefined,
      ),
    placeholderData: keepPreviousData,
  });

  const students = useQuery({
    queryKey: queryKeys.events.studentOptions(eventId, studentSearch),
    queryFn: () =>
      eventRegistrationService.students(
        eventId,
        1,
        studentSearch.length >= 3 ? studentSearch : undefined,
      ),
    enabled: adding,
    staleTime: 30_000,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["admin", "events", eventId, "registrations"],
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
    ]);
  };

  const add = useMutation({
    mutationFn: (studentId: string) => eventRegistrationService.registerStudent(eventId, studentId),
    onSuccess: async () => {
      setAdding(false);
      showToast(t.registrationSaved);
      await refresh();
    },
    onError: () => showToast(t.registrationFailed, "error"),
  });

  const cancel = useMutation({
    mutationFn: (studentId: string) => eventRegistrationService.cancelStudent(eventId, studentId),
    onSuccess: async () => {
      setCancelTarget(null);
      showToast(t.registrationSaved);
      await refresh();
    },
    onError: () => showToast(t.registrationFailed, "error"),
  });

  const pagination = registrations.data?.pagination ?? {
    page,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  const updateTerm = (value: string) => {
    setTerm(value);
    setPage(1);
  };

  const updateStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  return {
    registrations,
    students,
    add,
    cancel,
    pagination,
    page,
    setPage,
    term,
    updateTerm,
    status,
    updateStatus,
    adding,
    setAdding,
    studentTerm,
    setStudentTerm,
    cancelTarget,
    setCancelTarget,
  };
}
