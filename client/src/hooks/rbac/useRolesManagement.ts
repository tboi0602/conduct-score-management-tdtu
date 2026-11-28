"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { usePaginatedData } from "@/hooks/shared/usePaginatedData";
import { adminService } from "@/services/admin";
import type { Permission, Role } from "@/types/admin";
import {
  prependCachedEntity,
  removeCachedEntity,
  updateCachedEntity,
} from "@/lib/admin-query-cache";
import { queryKeys } from "@/lib/query-keys";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { useApi } from "@/hooks/api/useApi";

export function useRolesManagement(search = "") {
  const { t } = useAdminTranslations();
  const { execute, isLoading: isSaving, error: actionError, clearError } = useApi();
  const debouncedSearch = useDebounce(search, 500);
  const effectiveSearch = debouncedSearch.trim().length > 2 ? debouncedSearch.trim() : "";
  const list = usePaginatedData([...queryKeys.roles.all, effectiveSearch], (page, limit) =>
    adminService.listRoles(page, limit, effectiveSearch),
  );
  const queryClient = useQueryClient();
  const permissionsQuery = useQuery({
    queryKey: [...queryKeys.permissions.all, "options"],
    queryFn: () => adminService.listPermissions(1, 100),
    staleTime: 10 * 60 * 1000,
  });
  const permissions: Permission[] = permissionsQuery.data?.data ?? [];
  const [editing, setEditing] = useState<Role | null>(null);
  const [viewing, setViewing] = useState<Role | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Role | null>(null);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const payload = {
        name: String(form.get("code") ?? ""),
        displayName: String(form.get("displayName") ?? "").trim() || null,
        permissionIds: form.getAll("permissionIds").map(String),
      };
      await execute(
        () =>
          editing ? adminService.updateRole(editing.id, payload) : adminService.createRole(payload),
        {
          successMessage: t.roleSaved,
          onSuccess: (response) => {
            if (editing) updateCachedEntity(queryClient, queryKeys.roles.all, response.data);
            else prependCachedEntity(queryClient, queryKeys.roles.all, response.data);
            setModalOpen(false);
            setEditing(null);
          },
        },
      );
    },
    [editing, execute, queryClient, t.roleSaved],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    await execute(() => adminService.deleteRole(deleting.id), {
      successMessage: t.roleDeleted,
      onSuccess: () => {
        removeCachedEntity(queryClient, queryKeys.roles.all, deleting.id);
        if (list.items.length === 1 && !list.pagination.hasNextPage && list.page > 1)
          list.setPage(list.page - 1);
        setDeleting(null);
      },
    });
  }, [deleting, execute, list, queryClient, t.roleDeleted]);

  const openCreate = () => {
    setEditing(null);
    clearError();
    setModalOpen(true);
  };
  const openEdit = (role: Role) => {
    setEditing(role);
    clearError();
    setModalOpen(true);
  };
  const closeModal = () => {
    if (!isSaving) {
      setModalOpen(false);
      setEditing(null);
      clearError();
    }
  };
  return {
    ...list,
    actionError,
    closeModal,
    confirmDelete,
    deleting,
    editing,
    isModalOpen,
    isSaving,
    openCreate,
    openEdit,
    permissions,
    setDeleting,
    setViewing,
    submit,
    viewing,
  };
}
