"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { adminService } from "@/services/admin";
import type { Permission } from "@/types/admin";
import { usePaginatedData } from "@/hooks/usePaginatedData";
import {
  prependCachedEntity,
  removeCachedEntity,
  updateCachedEntity,
} from "@/lib/admin-query-cache";
import { queryKeys } from "@/lib/query-keys";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";

const fetchPermissions = (page: number, limit: number) => adminService.listPermissions(page, limit);

export function usePermissionsManagement() {
  const { locale } = useLanguage();
  const { showToast } = useToast();
  const list = usePaginatedData(queryKeys.permissions.all, fetchPermissions);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Permission | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Permission | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setActionError(null);
      setIsSaving(true);
      const form = new FormData(event.currentTarget);
      const payload = {
        permission: String(form.get("permission") ?? ""),
        description: String(form.get("description") ?? "") || null,
      };
      try {
        const response = editing
          ? await adminService.updatePermission(editing.id, payload)
          : await adminService.createPermission(payload);
        if (editing) updateCachedEntity(queryClient, queryKeys.permissions.all, response.data);
        else prependCachedEntity(queryClient, queryKeys.permissions.all, response.data);
        setModalOpen(false);
        setEditing(null);
        showToast(locale === "vi" ? "Lưu quyền thành công." : "Permission saved successfully.");
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Không thể lưu quyền");
        showToast(locale === "vi" ? "Không thể lưu quyền." : "Unable to save permission.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [editing, locale, queryClient, showToast],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await adminService.deletePermission(deleting.id);
      removeCachedEntity(queryClient, queryKeys.permissions.all, deleting.id);
      if (list.items.length === 1 && !list.pagination.hasNextPage && list.page > 1)
        list.setPage(list.page - 1);
      setDeleting(null);
      showToast(locale === "vi" ? "Xóa quyền thành công." : "Permission deleted successfully.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không thể xóa quyền");
      showToast(locale === "vi" ? "Không thể xóa quyền." : "Unable to delete permission.", "error");
    }
  }, [deleting, list, locale, queryClient, showToast]);

  const openCreate = () => {
    setEditing(null);
    setActionError(null);
    setModalOpen(true);
  };
  const openEdit = (item: Permission) => {
    setEditing(item);
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
    setDeleting,
    submit,
  };
}
