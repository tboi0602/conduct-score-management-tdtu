"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePaginatedData } from "@/hooks/usePaginatedData";
import { useDebounce } from "@/hooks/useDebounce";
import {
  prependCachedEntity,
  removeCachedEntity,
  updateCachedEntity,
} from "@/lib/admin-query-cache";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";
import type { AdminUser, Faculty, Role, UserFilters, UserPayload } from "@/types/admin";

export function useUsersManagement() {
  const [filters, setFilters] = useState<UserFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const fetchUsers = useCallback(
    (page: number, limit: number) => adminService.listUsers(page, limit, filters),
    [filters],
  );
  const list = usePaginatedData(queryKeys.users.list(filters), fetchUsers);
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({
    queryKey: [...queryKeys.roles.all, "options"],
    queryFn: () => adminService.listRoles(1, 100),
    staleTime: 10 * 60 * 1000,
  });
  const academicQuery = useQuery({
    queryKey: queryKeys.academic.options,
    queryFn: () => adminService.getAcademicOptions(),
    staleTime: 60 * 60 * 1000,
  });
  const roles: Role[] = rolesQuery.data?.data ?? [];
  const faculties: Faculty[] = academicQuery.data?.data ?? [];
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    const search = debouncedSearchTerm.trim() || undefined;
    list.setPage(1);
    setFilters((current) => (current.search === search ? current : { ...current, search }));
    // setPage is a stable React state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);
  const openCreate = () => {
    setEditing(null);
    setActionError(null);
    setModalOpen(true);
  };
  const openEdit = (user: AdminUser) => {
    setEditing(user);
    setActionError(null);
    setModalOpen(true);
  };
  const closeModal = () => {
    if (!isSaving) {
      setModalOpen(false);
      setEditing(null);
      setActionError(null);
    }
  };
  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setActionError(null);
      setIsSaving(true);
      const form = new FormData(event.currentTarget);
      const password = String(form.get("password") ?? "");
      const payload: UserPayload = {
        email: String(form.get("email") ?? ""),
        name: String(form.get("name") ?? ""),
        roleIds: form.getAll("roleIds").map(String),
        studentCode: String(form.get("studentCode") ?? "") || null,
        classId: String(form.get("classId") ?? "") || null,
        ...(password ? { password } : {}),
      };
      try {
        const response = editing
          ? await adminService.updateUser(editing.id, payload)
          : await adminService.createUser(payload);
        if (editing) updateCachedEntity(queryClient, queryKeys.users.all, response.data);
        else prependCachedEntity(queryClient, queryKeys.users.all, response.data);
        setModalOpen(false);
        setEditing(null);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Unable to save user");
      } finally {
        setIsSaving(false);
      }
    },
    [editing, queryClient],
  );
  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await adminService.deleteUser(deleting.id);
      removeCachedEntity(queryClient, queryKeys.users.all, deleting.id);
      setDeleting(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete user");
    }
  }, [deleting, queryClient]);
  const applyFilters = (next: UserFilters) => {
    list.setPage(1);
    setFilters(next);
  };
  return {
    ...list,
    actionError,
    applyFilters,
    closeModal,
    confirmDelete,
    deleting,
    editing,
    faculties,
    filters,
    isModalOpen,
    isSaving,
    openCreate,
    openEdit,
    roles,
    searchTerm,
    setDeleting,
    setSearchTerm,
    submit,
  };
}
