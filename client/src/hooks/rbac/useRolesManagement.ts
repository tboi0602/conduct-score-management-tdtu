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
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";

const fetchRoles = (page: number, limit: number) => adminService.listRoles(page, limit);

export function useRolesManagement() {
  const { locale } = useLanguage();
  const { showToast } = useToast();
  const list = usePaginatedData(queryKeys.roles.all, fetchRoles);
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setActionError(null);
      setIsSaving(true);
      const form = new FormData(event.currentTarget);
      const payload = {
        name: String(form.get("name") ?? ""),
        permissionIds: form.getAll("permissionIds").map(String),
      };
      try {
        const response = editing
          ? await adminService.updateRole(editing.id, payload)
          : await adminService.createRole(payload);
        if (editing) updateCachedEntity(queryClient, queryKeys.roles.all, response.data);
        else prependCachedEntity(queryClient, queryKeys.roles.all, response.data);
        setModalOpen(false);
        setEditing(null);
        showToast(locale === "vi" ? "Lưu vai trò thành công." : "Role saved successfully.");
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Không thể lưu vai trò");
        showToast(locale === "vi" ? "Không thể lưu vai trò." : "Unable to save role.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [editing, locale, queryClient, showToast],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await adminService.deleteRole(deleting.id);
      removeCachedEntity(queryClient, queryKeys.roles.all, deleting.id);
      if (list.items.length === 1 && !list.pagination.hasNextPage && list.page > 1)
        list.setPage(list.page - 1);
      setDeleting(null);
      showToast(locale === "vi" ? "Xóa vai trò thành công." : "Role deleted successfully.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không thể xóa vai trò");
      showToast(locale === "vi" ? "Không thể xóa vai trò." : "Unable to delete role.", "error");
    }
  }, [deleting, list, locale, queryClient, showToast]);

  const openCreate = () => {
    setEditing(null);
    setActionError(null);
    setModalOpen(true);
  };
  const openEdit = (role: Role) => {
    setEditing(role);
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
