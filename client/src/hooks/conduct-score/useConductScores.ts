"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";
import { conductScoreService } from "@/services/conduct-scores";
import { eventService, semesterService } from "@/services/events";
import type { ConductScoreFilters } from "@/types/conduct-score";

const mutationMessage = {
  vi: {
    success: "Cập nhật điểm rèn luyện thành công.",
    error: "Không thể cập nhật điểm rèn luyện.",
  },
  en: { success: "Conduct score updated successfully.", error: "Unable to update conduct score." },
};

const bulkFinalizeMessage = {
  vi: {
    success: (count: number) => `Đã chốt điểm rèn luyện cho ${count} sinh viên.`,
    error: "Không thể chốt điểm hàng loạt.",
  },
  en: {
    success: (count: number) => `Finalized conduct scores for ${count} students.`,
    error: "Unable to finalize conduct scores in bulk.",
  },
};

export function useConductScoresManagement() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<ConductScoreFilters>({ semesterId: "" });
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const client = useQueryClient();
  const { locale } = useLanguage();
  const { showToast } = useToast();
  const search = useDebounce(searchTerm.trim(), 500);
  const semesters = useQuery({
    queryKey: queryKeys.semesters.list({}),
    queryFn: () => semesterService.list(1, 100),
    staleTime: 10 * 60_000,
  });
  const academicOptions = useQuery({
    queryKey: queryKeys.academic.options,
    queryFn: adminService.getAcademicOptions,
    staleTime: 60 * 60_000,
  });
  useEffect(() => {
    const first = semesters.data?.data[0];
    if (first && !filters.semesterId)
      setFilters((current) => ({ ...current, semesterId: first.id }));
  }, [filters.semesterId, semesters.data?.data]);
  useEffect(() => {
    setPage(1);
    setFilters((current) => ({ ...current, search: search || undefined }));
  }, [search]);
  useEffect(() => {
    setSelectedStudentIds([]);
  }, [
    filters.semesterId,
    filters.facultyId,
    filters.majorId,
    filters.classId,
    filters.status,
    filters.ranking,
    search,
  ]);
  const list = useQuery({
    queryKey: queryKeys.conductScores.list({ ...filters, page }),
    queryFn: () => conductScoreService.list(page, 20, filters),
    enabled: Boolean(filters.semesterId),
    staleTime: 30_000,
  });
  const bulkFinalize = useMutation({
    mutationFn: (studentIds?: string[]) => {
      const { semesterId, ...activeFilters } = filters;
      return conductScoreService
        .bulkFinalize({ semesterId, filters: activeFilters, studentIds })
        .then((response) => response.data);
    },
    onSuccess: async (result) => {
      setSelectedStudentIds([]);
      showToast(bulkFinalizeMessage[locale].success(result.finalized));
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.conductScores.all }),
        client.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
      ]);
    },
    onError: () => showToast(bulkFinalizeMessage[locale].error, "error"),
  });
  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  };
  const toggleStudents = (studentIds: string[]) => {
    setSelectedStudentIds((current) => {
      const allSelected = studentIds.every((id) => current.includes(id));
      return allSelected
        ? current.filter((id) => !studentIds.includes(id))
        : [...new Set([...current, ...studentIds])];
    });
  };
  return {
    page,
    setPage,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    semesters,
    academicOptions,
    list,
    selectedStudentIds,
    toggleStudent,
    toggleStudents,
    bulkFinalize,
  };
}

function useConductScoreMutation<TVariables>(
  studentId: string,
  semesterId: string,
  mutationFn: (variables: TVariables) => Promise<unknown>,
) {
  const client = useQueryClient();
  const { locale } = useLanguage();
  const { showToast } = useToast();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      showToast(mutationMessage[locale].success);
      await Promise.all([
        client.invalidateQueries({
          queryKey: queryKeys.conductScores.detail(studentId, semesterId),
        }),
        client.invalidateQueries({ queryKey: queryKeys.conductScores.all }),
        client.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
      ]);
    },
    onError: () => showToast(mutationMessage[locale].error, "error"),
  });
}

export function useConductScoreDetail(studentId: string, semesterId: string) {
  const query = useQuery({
    queryKey: queryKeys.conductScores.detail(studentId, semesterId),
    queryFn: () =>
      conductScoreService.detail(studentId, semesterId).then((response) => response.data),
    enabled: Boolean(studentId && semesterId),
    staleTime: 30_000,
  });
  const adjust = useConductScoreMutation(
    studentId,
    semesterId,
    (payload: { criteriaId: string; points: number; reason: string; result: string }) =>
      conductScoreService.adjust(studentId, { ...payload, semesterId }),
  );
  const finalize = useConductScoreMutation(studentId, semesterId, () =>
    conductScoreService.finalize(studentId, semesterId),
  );
  const reopen = useConductScoreMutation(studentId, semesterId, (reason: string) =>
    conductScoreService.reopen(studentId, semesterId, reason),
  );
  const criteria = useQuery({
    queryKey: queryKeys.eventOptions.criteriaPage(1),
    queryFn: () => eventService.criteria(1),
    staleTime: 10 * 60_000,
  });
  return { query, adjust, finalize, reopen, criteria };
}

export function useMyConductScore(semesterId: string) {
  return useQuery({
    queryKey: queryKeys.conductScores.mine(semesterId),
    queryFn: () => conductScoreService.mine(semesterId).then((response) => response.data),
    enabled: Boolean(semesterId),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

const localDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function useMyConductScores() {
  const [semesterId, setSemesterId] = useState("");
  const semesters = useQuery({
    queryKey: queryKeys.semesters.list({}),
    queryFn: () => semesterService.list(1, 100),
    staleTime: 10 * 60_000,
  });
  useEffect(() => {
    if (semesterId || !semesters.data?.data.length) return;
    const today = localDate();
    const activeSemester = semesters.data.data.find(
      (semester) =>
        semester.startDate.slice(0, 10) <= today && today <= semester.endDate.slice(0, 10),
    );
    setSemesterId((activeSemester ?? semesters.data.data[0]).id);
  }, [semesterId, semesters.data]);
  const score = useMyConductScore(semesterId);
  return { semesterId, setSemesterId, semesters, score };
}
