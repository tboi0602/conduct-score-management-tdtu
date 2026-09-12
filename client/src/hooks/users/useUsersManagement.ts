"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePaginatedData } from "@/hooks/shared/usePaginatedData";
import { useDebounce } from "@/hooks/shared/useDebounce";
import {
  prependCachedEntity,
  removeCachedEntity,
  updateCachedEntity,
} from "@/lib/admin-query-cache";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";
import type { AdminUser, Faculty, Role, UserFilters, UserPayload } from "@/types/admin";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";

export function useUsersManagement() {
  const access = useAdminAccess();
  const scoped = !access.can("user.read") && access.can("student.read");
  const { locale } = useLanguage();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<UserFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const fetchUsers = useCallback(
    (page: number, limit: number) =>
      scoped
        ? adminService.listFacultyUsers(page, limit, filters)
        : adminService.listUsers(page, limit, filters),
    [filters, scoped],
  );
  const list = usePaginatedData(queryKeys.users.list(filters), fetchUsers);
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({
    queryKey: [...queryKeys.roles.all, "options"],
    queryFn: () => adminService.listRoles(1, 100),
    enabled: !scoped,
    staleTime: 10 * 60 * 1000,
  });
  const academicQuery = useQuery({
    queryKey: queryKeys.academic.options,
    queryFn: () => adminService.getAcademicOptions(),
    staleTime: 60 * 60 * 1000,
  });
  const roles: Role[] = scoped
    ? ["STUDENT", "EVENT_ORGANIZER"].map((name) => ({
        id: name,
        name,
        rolePermissions: [],
        _count: { userRoles: 0 },
      }))
    : (rolesQuery.data?.data ?? []);
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
        primaryFacultyId: String(form.get("primaryFacultyId") ?? "") || null,
        ...(password ? { password } : {}),
      };
      try {
        const response = editing
          ? await (scoped
              ? adminService.updateFacultyUser(editing.id, payload)
              : adminService.updateUser(editing.id, payload))
          : await (scoped
              ? adminService.createFacultyUser(payload)
              : adminService.createUser(payload));
        if (editing) updateCachedEntity(queryClient, queryKeys.users.all, response.data);
        else prependCachedEntity(queryClient, queryKeys.users.all, response.data);
        setModalOpen(false);
        setEditing(null);
        showToast(
          locale === "vi"
            ? editing
              ? "Cập nhật người dùng thành công."
              : "Thêm người dùng thành công."
            : editing
              ? "User updated successfully."
              : "User added successfully.",
        );
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Unable to save user");
        showToast(locale === "vi" ? "Không thể lưu người dùng." : "Unable to save user.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [editing, locale, queryClient, scoped, showToast],
  );
  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    if (deleting.id === access.profile?.id) {
      showToast(
        locale === "vi"
          ? "Bạn không thể tự xóa tài khoản của mình."
          : "You cannot delete your own account.",
        "error",
      );
      setDeleting(null);
      return;
    }
    try {
      const result = await (scoped
        ? adminService.deleteFacultyUser(deleting)
        : adminService.deleteUser(deleting.id));
      if (scoped && !deleting.student && result && "data" in result)
        updateCachedEntity(queryClient, queryKeys.users.all, result.data);
      else removeCachedEntity(queryClient, queryKeys.users.all, deleting.id);
      if (list.items.length === 1 && !list.pagination.hasNextPage && list.page > 1)
        list.setPage(list.page - 1);
      setDeleting(null);
      showToast(locale === "vi" ? "Xóa người dùng thành công." : "User deleted successfully.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete user");
      showToast(locale === "vi" ? "Không thể xóa người dùng." : "Unable to delete user.", "error");
    }
  }, [access.profile?.id, deleting, list, locale, queryClient, scoped, showToast]);
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
    currentUserId: access.profile?.id,
    openCreate,
    openEdit,
    roles,
    searchTerm,
    setDeleting,
    setSearchTerm,
    submit,
  };
}
