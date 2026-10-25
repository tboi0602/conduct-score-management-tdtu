"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePaginatedData } from "@/hooks/shared/usePaginatedData";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { useBulkAction } from "@/hooks/shared/useBulkAction";
import {
  prependCachedEntity,
  removeCachedEntity,
  updateCachedEntity,
} from "@/lib/admin-query-cache";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";
import { HttpError } from "@/services/http";
import type { AdminUser, Faculty, Role, UserFilters, UserPayload } from "@/types/admin";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";

export function useUsersManagement(mode?: "STUDENT" | "STAFF") {
  const access = useAdminAccess();
  const scoped = !access.can("user.read") && access.can("student.read");
  const { locale, t } = useAdminTranslations();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<UserFilters>(() => (mode ? { userType: mode } : {}));
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
  const bulkDeleteStudents = useBulkAction({
    mutationFn: scoped ? adminService.deleteFacultyStudents : adminService.deleteStudents,
    queryKeys: [queryKeys.users.all],
  });
  const bulkActivateStaff = useBulkAction({
    mutationFn: (ids) =>
      (scoped ? adminService.setFacultyStaffStatuses : adminService.setStaffStatuses)(
        ids,
        "ACTIVE",
      ),
    queryKeys: [queryKeys.users.all, queryKeys.auth.me],
  });
  const bulkDisableStaff = useBulkAction({
    mutationFn: (ids) =>
      (scoped ? adminService.setFacultyStaffStatuses : adminService.setStaffStatuses)(
        ids,
        "DISABLED",
      ),
    queryKeys: [queryKeys.users.all, queryKeys.auth.me],
  });
  const roles: Role[] = scoped
    ? ["STUDENT", "EVENT_ORGANIZER", "STUDENT_AFFAIRS"].map((name) => ({
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
  const [actionFieldErrors, setActionFieldErrors] = useState<Record<string, string>>({});
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
    setActionFieldErrors({});
    setModalOpen(true);
  };
  const openEdit = (user: AdminUser) => {
    setEditing(user);
    setActionError(null);
    setActionFieldErrors({});
    setModalOpen(true);
  };
  const closeModal = () => {
    if (!isSaving) {
      setModalOpen(false);
      setEditing(null);
      setActionError(null);
      setActionFieldErrors({});
    }
  };
  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setActionError(null);
      setActionFieldErrors({});
      setIsSaving(true);
      const form = new FormData(event.currentTarget);
      const password = String(form.get("password") ?? "");
      const formRoleIds = form.getAll("roleIds").map(String);
      const payload: UserPayload = {
        email:
          mode === "STAFF"
            ? String(form.get("email") ?? "")
                .trim()
                .toLowerCase()
            : String(form.get("email") ?? "").trim(),
        name: String(form.get("name") ?? "").trim(),
        roleIds:
          formRoleIds.length > 0
            ? formRoleIds
            : mode
              ? (editing?.userRoles.map(({ role }) => role.id) ?? [])
              : [],
        ...(mode !== "STAFF"
          ? {
              studentCode: String(form.get("studentCode") ?? "") || null,
              classId: String(form.get("classId") ?? "") || null,
            }
          : {}),
        ...(!mode || mode === "STAFF"
          ? { primaryFacultyId: String(form.get("primaryFacultyId") ?? "") || null }
          : {}),
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
          mode === "STAFF"
            ? editing
              ? t.staffUpdateSuccess
              : t.staffCreateSuccess
            : locale === "vi"
              ? editing
                ? "Cập nhật người dùng thành công."
                : "Thêm người dùng thành công."
              : editing
                ? "User updated successfully."
                : "User added successfully.",
        );
      } catch (error) {
        if (mode === "STAFF" && error instanceof HttpError) {
          const fieldByCode: Record<string, { field: string; message: string }> = {
            STAFF_EMAIL_INVALID: { field: "email", message: t.staffEmailInvalid },
            STAFF_PASSWORD_REQUIRED: { field: "password", message: t.passwordRequired },
            STAFF_ROLE_INVALID: { field: "roleIds", message: t.staffRoleRequired },
            STAFF_FACULTY_REQUIRED: {
              field: "primaryFacultyId",
              message: t.staffFacultyRequired,
            },
            STAFF_FACULTY_NOT_FOUND: {
              field: "primaryFacultyId",
              message: t.staffFacultyRequired,
            },
            USER_ALREADY_EXISTS: { field: "email", message: t.emailAlreadyExists },
          };
          const fieldError = fieldByCode[error.code];
          if (fieldError) setActionFieldErrors({ [fieldError.field]: fieldError.message });
          else setActionError(t.staffSaveError);
        } else {
          setActionError(error instanceof Error ? error.message : "Unable to save user");
        }
        showToast(
          mode === "STAFF"
            ? t.staffSaveError
            : locale === "vi"
              ? "Không thể lưu người dùng."
              : "Unable to save user.",
          "error",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [editing, locale, mode, queryClient, scoped, showToast, t],
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
      const message =
        error instanceof HttpError && error.code === "STUDENT_HAS_STAFF_ROLE"
          ? t.studentHasStaffRole
          : locale === "vi"
            ? "Không thể xóa người dùng."
            : "Unable to delete user.";
      setActionError(message);
      showToast(message, "error");
    }
  }, [access.profile?.id, deleting, list, locale, queryClient, scoped, showToast, t]);
  const applyFilters = (next: UserFilters) => {
    list.setPage(1);
    setFilters(next);
  };
  return {
    ...list,
    actionError,
    actionFieldErrors,
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
    canBulkDeleteStudents:
      mode === "STUDENT" && (scoped ? access.can("student.delete") : access.can("user.delete")),
    canBulkManageStaff:
      mode === "STAFF" &&
      (scoped ? access.can("faculty-staff.disable") : access.can("user.update")),
    bulkDeleteStudents,
    bulkActivateStaff,
    bulkDisableStaff,
    canCreateStaff:
      Boolean(access.profile?.roles.some((role) => role.name === "ADMIN")) &&
      access.can("user.create"),
    openCreate,
    openEdit,
    roles,
    searchTerm,
    setDeleting,
    setSearchTerm,
    submit,
  };
}
