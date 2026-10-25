"use client";

import { Plus } from "lucide-react";
import { useMemo } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UserFormModal } from "@/components/admin/users/UserFormModal";
import { UsersBulkActions } from "@/components/admin/users/UsersBulkActions";
import { UsersFilters } from "@/components/admin/users/UsersFilters";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { usePageSelection } from "@/hooks/shared/usePageSelection";
import { useUsersManagement } from "@/hooks/users/useUsersManagement";

type UserManagementMode = "STUDENT" | "STAFF";

export function UsersManagement({ mode }: { mode?: UserManagementMode }) {
  const state = useUsersManagement(mode);
  const { t, locale } = useAdminTranslations();
  const selectableIds = useMemo(() => {
    if (mode === "STUDENT" && state.canBulkDeleteStudents) {
      return state.items
        .filter(
          (user) =>
            Boolean(user.student) &&
            user.id !== state.currentUserId &&
            !user.userRoles.some(({ role }) => role.name === "ADMIN"),
        )
        .map((user) => user.id);
    }
    if (mode === "STAFF" && state.canBulkManageStaff) {
      return state.items
        .filter(
          (user) =>
            user.id !== state.currentUserId &&
            !user.userRoles.some(({ role }) => role.name === "ADMIN"),
        )
        .map((user) => user.id);
    }
    return [];
  }, [
    mode,
    state.canBulkDeleteStudents,
    state.canBulkManageStaff,
    state.currentUserId,
    state.items,
  ]);
  const selection = usePageSelection(selectableIds);
  const canCreate = !mode || (mode === "STAFF" && state.canCreateStaff);

  return (
    <section>
      <AdminPageHeader
        eyebrow={t.userEyebrow}
        title={
          mode === "STUDENT"
            ? locale === "vi"
              ? "Sinh viên"
              : "Students"
            : mode === "STAFF"
              ? locale === "vi"
                ? "Nhân sự"
                : "Staff"
              : t.userTitle
        }
        description={
          mode
            ? locale === "vi"
              ? "Danh sách người dùng trong phạm vi được phép."
              : "Users in your authorized scope."
            : t.userDescription
        }
        action={
          canCreate ? (
            <button
              type="button"
              onClick={state.openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#154a9b] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_28px_-14px_rgba(21,74,155,.7)] transition hover:-translate-y-0.5 hover:bg-[#103f86] active:translate-y-0 active:scale-[.98]"
            >
              <Plus size={17} />
              {mode === "STAFF" ? t.addStaff : t.addUser}
            </button>
          ) : undefined
        }
      />
      <UsersFilters
        mode={mode}
        searchTerm={state.searchTerm}
        filters={state.filters}
        faculties={state.faculties}
        roles={state.roles}
        onSearchChange={state.setSearchTerm}
        onApply={state.applyFilters}
      />
      <UsersBulkActions mode={mode} state={state} selection={selection} />
      {state.actionError && !state.isModalOpen ? (
        <p role="alert" className="mt-4 rounded-xl bg-[#fff1f2] px-4 py-3 text-sm text-[#b72e3f]">
          {state.actionError}
        </p>
      ) : null}
      <UsersTable mode={mode} state={state} selectableIds={selectableIds} selection={selection} />
      <UserFormModal
        open={state.isModalOpen}
        user={state.editing}
        mode={mode}
        roles={state.roles}
        faculties={state.faculties}
        onSubmit={state.submit}
        onClose={state.closeModal}
        saving={state.isSaving}
        error={state.actionError}
        apiFieldErrors={state.actionFieldErrors}
      />
      <ConfirmDialog
        open={Boolean(state.deleting)}
        onClose={() => state.setDeleting(null)}
        onConfirm={state.confirmDelete}
        title={t.confirmDeleteUser}
        subject={state.deleting?.email ?? ""}
      />
    </section>
  );
}
