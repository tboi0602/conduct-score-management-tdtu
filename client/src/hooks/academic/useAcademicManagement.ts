"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { usePaginatedData } from "@/hooks/shared/usePaginatedData";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";
import type { AcademicKind, AcademicPayload, AcademicRecord } from "@/types/admin";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";

export function useAcademicManagement(kind: AcademicKind) {
  const { message } = useLanguage();
  const locale = message.common;
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const search = useDebounce(searchTerm.trim(), 500);
  const [facultyId, setFacultyId] = useState("");
  const [majorId, setMajorId] = useState("");
  const fetcher = useCallback(
    (page: number, limit: number) =>
      adminService.listAcademic(kind, page, limit, {
        search: search.length >= 3 ? search : undefined,
        facultyId: facultyId || undefined,
        majorId: majorId || undefined,
      }),
    [facultyId, kind, majorId, search],
  );
  const list = usePaginatedData(queryKeys.academic.list(kind, search, facultyId, majorId), fetcher);
  const options = useQuery({
    queryKey: queryKeys.academic.options,
    queryFn: adminService.getAcademicOptions,
    staleTime: 60 * 60_000,
  });
  const [editing, setEditing] = useState<AcademicRecord | null>(null);
  const [deleting, setDeleting] = useState<AcademicRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setPage } = list;
  useEffect(() => setPage(1), [facultyId, majorId, search, setPage]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: AcademicPayload = {
      code: String(form.get("code") ?? ""),
      name: String(form.get("name") ?? ""),
      facultyId: String(form.get("facultyId") ?? "") || undefined,
      majorId: String(form.get("majorId") ?? "") || undefined,
    };
    setSaving(true);
    setError(null);
    try {
      if (editing) await adminService.updateAcademic(kind, editing.id, payload);
      else await adminService.createAcademic(kind, payload);
      setOpen(false);
      setEditing(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.academic.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.academic.options }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organizers.all }),
      ]);
      showToast(locale.academicSaved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : locale.saveDataError);
      showToast(locale.academicSaveError, "error");
    } finally {
      setSaving(false);
    }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await adminService.deleteAcademic(kind, deleting.id);
      if (list.items.length === 1 && !list.pagination.hasNextPage && list.page > 1)
        list.setPage(list.page - 1);
      setDeleting(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.academic.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.academic.options }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organizers.all }),
      ]);
      showToast(locale.academicDeleted);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : locale.deleteDataError);
      showToast(locale.academicDeleteError, "error");
    }
  };
  return {
    ...list,
    options: options.data?.data ?? [],
    searchTerm,
    setSearchTerm,
    facultyId,
    setFacultyId,
    majorId,
    setMajorId,
    editing,
    deleting,
    setDeleting,
    open,
    saving,
    error,
    submit,
    confirmDelete,
    openCreate: () => {
      setEditing(null);
      setError(null);
      setOpen(true);
    },
    openEdit: (item: AcademicRecord) => {
      setEditing(item);
      setError(null);
      setOpen(true);
    },
    close: () => {
      if (!saving) setOpen(false);
    },
  };
}
