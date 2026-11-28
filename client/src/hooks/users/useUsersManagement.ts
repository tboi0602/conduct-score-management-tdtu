"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePaginatedData } from "@/hooks/shared/usePaginatedData";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { useBulkAction } from "@/hooks/shared/useBulkAction";
import { useUrlQueryState } from "@/hooks/shared/useUrlQueryState";
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
import { extractServerErrorMessage, useApi } from "@/hooks/api/useApi";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";

export function useUsersManagement(mode?: "STUDENT" | "STAFF") {
  const access = useAdminAccess();
  const scoped = !access.can("user.read") && access.can("student.read");
  const { locale, t } = useAdminTranslations();
  const { showToast } = useToast();
  const { execute } = useApi();
  const [searchTerm, setSearchTerm] = useUrlQueryState("search");
  const [facultyId, setFacultyId] = useUrlQueryState("facultyId");
  const [majorId, setMajorId] = useUrlQueryState("majorId");
  const [classId, setClassId] = useUrlQueryState("classId");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const filters = useMemo<UserFilters>(
    () => ({
      ...(mode ? { userType: mode } : {}),
      ...(debouncedSearchTerm.trim().length > 2 ? { search: debouncedSearchTerm.trim() } : {}),
      ...(facultyId ? { facultyId } : {}),
      ...(majorId ? { majorId } : {}),
      ...(classId ? { classId } : {}),
    }),
    [classId, debouncedSearchTerm, facultyId, majorId, mode],
  );
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
    enabled: !scoped || access.can("user.assign-role") || access.can("role.read"),
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
  const roles: Role[] = rolesQuery.data?.data ?? [];
  const faculties: Faculty[] = academicQuery.data?.data ?? [];
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionFieldErrors, setActionFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
        setModalOpen(false);
        setEditing(null);
        showToast(
          mode === "STAFF"
            ? editing
              ? t.staffUpdateSuccess
              : t.staffCreateSuccess
            : editing
              ? t.userUpdated
              : t.userCreated,
        );
      } catch (error) {
        let toastMessage = extractServerErrorMessage(
          error,
          mode === "STAFF" ? t.staffSaveError : t.userSaveError,
        );
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
          if (fieldError) {
            setActionFieldErrors({ [fieldError.field]: fieldError.message });
            toastMessage = fieldError.message;
          } else {
            setActionError(toastMessage);
          }
        } else {
          setActionError(toastMessage);
        }
        showToast(toastMessage, "error");
      } finally {
        setIsSaving(false);
      }
    },
    [editing, mode, queryClient, scoped, showToast, t],
  );
  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    if (deleting.id === access.profile?.id) {
      showToast(t.cannotDeleteSelf, "error");
      setDeleting(null);
      return;
    }
    await execute<void | { ok: true; data: AdminUser }>(
      () =>
        scoped ? adminService.deleteFacultyUser(deleting) : adminService.deleteUser(deleting.id),
      {
        successMessage: t.userDeleted,
        onSuccess: (result) => {
          if (scoped && !deleting.student && result && "data" in result)
            updateCachedEntity(queryClient, queryKeys.users.all, result.data);
          else removeCachedEntity(queryClient, queryKeys.users.all, deleting.id);
          if (list.items.length === 1 && !list.pagination.hasNextPage && list.page > 1)
            list.setPage(list.page - 1);
          setDeleting(null);
        },
        onError: (message, error) => {
          const resolved =
            error instanceof HttpError && error.code === "STUDENT_HAS_STAFF_ROLE"
              ? t.studentHasStaffRole
              : message;
          setActionError(resolved);
        },
      },
    );
  }, [access.profile?.id, deleting, execute, list, queryClient, scoped, showToast, t]);
  const applyFilters = (next: UserFilters) => {
    list.setPage(1);
    setFacultyId(next.facultyId ?? "");
    setMajorId(next.majorId ?? "");
    setClassId(next.classId ?? "");
  };
  return {
    ...list,
    scoped,
    effectiveFacultyId: access.profile?.effectiveFaculty?.id ?? "",
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
      mode === "STUDENT"
        ? access.can("user.create") || access.can("faculty-staff.create-student")
        : access.can("user.create") || access.can("faculty-staff.create"),
    openCreate,
    openEdit,
    roles,
    searchTerm,
    setDeleting,
    setSearchTerm,
    submit,
  };
}
