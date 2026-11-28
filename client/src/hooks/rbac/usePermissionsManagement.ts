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
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useDebounce } from "@/hooks/shared/useDebounce";

export function usePermissionsManagement(search = "") {
  const { locale } = useLanguage();
  const { showToast } = useToast();
  const debouncedSearch = useDebounce(search, 350);
  const effectiveSearch = debouncedSearch.trim().length > 2 ? debouncedSearch.trim() : "";
  const list = usePaginatedData([...queryKeys.permissions.all, effectiveSearch], (page, limit) =>
    adminService.listPermissions(page, limit, effectiveSearch),
  );
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
      if (!editing) return;
      const payload = {
        permission: String(form.get("permission") ?? ""),
        description: String(form.get("description") ?? "") || null,
      };
      try {
        const response = await adminService.updatePermission(editing.id, payload);
        updateCachedEntity(queryClient, queryKeys.permissions.all, response.data);
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
    setDeleting(null);
  }, []);

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
