"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { adminService } from "@/services/admin";
import type { Permission } from "@/types/admin";
import { usePaginatedData } from "@/hooks/shared/usePaginatedData";
import {
  prependCachedEntity,
  removeCachedEntity,
  updateCachedEntity,
} from "@/lib/admin-query-cache";
import { queryKeys } from "@/lib/query-keys";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { useApi } from "@/hooks/api/useApi";

export function usePermissionsManagement(search = "") {
  const { t } = useAdminTranslations();
  const { execute, isLoading: isSaving, error: actionError, clearError } = useApi();
  const debouncedSearch = useDebounce(search, 500);
  const effectiveSearch = debouncedSearch.trim().length > 2 ? debouncedSearch.trim() : "";
  const list = usePaginatedData([...queryKeys.permissions.all, effectiveSearch], (page, limit) =>
    adminService.listPermissions(page, limit, effectiveSearch),
  );
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Permission | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Permission | null>(null);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editing) return;
      const form = new FormData(event.currentTarget);
      const payload = {
        permission: String(form.get("permission") ?? ""),
        description: String(form.get("description") ?? "") || null,
      };
      await execute(() => adminService.updatePermission(editing.id, payload), {
        successMessage: t.permissionSaved,
        onSuccess: (response) => {
          updateCachedEntity(queryClient, queryKeys.permissions.all, response.data);
          setModalOpen(false);
          setEditing(null);
        },
      });
    },
    [editing, execute, queryClient, t.permissionSaved],
  );

  const confirmDelete = useCallback(async () => {
    setDeleting(null);
  }, []);

  const openCreate = () => {
    setEditing(null);
    clearError();
    setModalOpen(true);
  };
  const openEdit = (item: Permission) => {
    setEditing(item);
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
    setDeleting,
    submit,
  };
}
