"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { UserDetailDrawer } from "@/components/admin/users/UserDetailDrawer";
import { UsersBulkActions } from "@/components/admin/users/UsersBulkActions";
import { useUserColumns } from "@/components/admin/users/useUserColumns";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { OpsDetailDrawer } from "@/components/ui/OpsDetailDrawer";
import { SheetTable } from "@/components/ui/SheetTable";
import { SheetToolbar } from "@/components/ui/SheetToolbar";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { usePageSelection } from "@/hooks/shared/usePageSelection";
import { useUsersManagement } from "@/hooks/users/useUsersManagement";
import type { AdminUser } from "@/types/admin";

type UserManagementMode = "STUDENT" | "STAFF";

export function UsersManagement({ mode }: { mode?: UserManagementMode }) {
  const state = useUsersManagement(mode);
  const { t } = useAdminTranslations();
  const [viewing, setViewing] = useState<AdminUser | null>(null);
  const selectableIds = useMemo(() => {
    if (mode === "STUDENT" && state.canBulkDeleteStudents) {
      return state.items
        .filter(
          (user) =>
            Boolean(user.student) && user.id !== state.currentUserId && user.email !== "admin",
        )
        .map((user) => user.id);
    }
    if (mode === "STAFF" && state.canBulkManageStaff) {
      return state.items
        .filter((user) => user.id !== state.currentUserId && user.email !== "admin")
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
  const canCreate = !mode || state.canCreateStaff;

  const { visibleColumns, allColumns, hiddenKeys, toggleColumn } = useUserColumns({
    mode,
    page: state.page,
    currentUserId: state.currentUserId,
    t,
    onEdit: state.openEdit,
    onDelete: state.setDeleting,
  });

  const majorOptions = useMemo(() => {
    const faculties = state.filters.facultyId
      ? state.faculties.filter((f) => f.id === state.filters.facultyId)
      : state.faculties;
    return faculties.flatMap((f) => (f.majors ?? []).map((m) => ({ value: m.id, label: m.name })));
  }, [state.faculties, state.filters.facultyId]);

  const classOptions = useMemo(() => {
    const faculties = state.filters.facultyId
      ? state.faculties.filter((f) => f.id === state.filters.facultyId)
      : state.faculties;
    const majors = faculties.flatMap((f) => f.majors ?? []);
    const filteredMajors = state.filters.majorId
      ? majors.filter((m) => m.id === state.filters.majorId)
      : majors;
    return filteredMajors.flatMap((m) =>
      (m.classes ?? []).map((c) => ({ value: c.id, label: c.name })),
    );
  }, [state.faculties, state.filters.facultyId, state.filters.majorId]);

  const selectedFacultyLabel = state.faculties.find((f) => f.id === state.filters.facultyId)?.name;
  const selectedMajorLabel = majorOptions.find((m) => m.value === state.filters.majorId)?.label;
  const selectedClassLabel = classOptions.find((c) => c.value === state.filters.classId)?.label;
  const activeFilters = [
    ...(selectedFacultyLabel ? [{ key: "faculty", label: selectedFacultyLabel }] : []),
    ...(selectedMajorLabel ? [{ key: "major", label: selectedMajorLabel }] : []),
    ...(selectedClassLabel ? [{ key: "class", label: selectedClassLabel }] : []),
  ];

  return (
    <section className="flex h-dvh w-full overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <UsersBulkActions mode={mode} state={state} selection={selection} />
        <div className="min-h-0 flex-1 overflow-hidden">
          <SheetTable
            columns={visibleColumns}
            data={state.items}
            rowKey={(item) => item.id}
            isLoading={state.isLoading}
            error={state.error}
            pagination={state.pagination}
            onPageChange={state.setPage}
            onRowClick={(item) => setViewing(item)}
            toolbar={
              <SheetToolbar
                search={state.searchTerm}
                onSearchChange={state.setSearchTerm}
                searchPlaceholder={t.searchPlaceholder}
                columns={allColumns}
                hiddenColumnKeys={hiddenKeys}
                onToggleColumn={toggleColumn}
                activeFilters={activeFilters}
                onClearFilters={() => {
                  state.setSearchTerm("");
                  state.applyFilters({});
                }}
                filters={
                  !state.scoped ? (
                    <div className="flex shrink-0 items-center gap-2">
                      {state.faculties.length > 0 ? (
                        <div className="w-48">
                          <CustomSelect
                            value={state.filters.facultyId ?? ""}
                            onChange={(val) =>
                              state.applyFilters({
                                ...state.filters,
                                facultyId: val || undefined,
                                majorId: undefined,
                                classId: undefined,
                              })
                            }
                            options={state.faculties.map((f) => ({ value: f.id, label: f.name }))}
                            placeholder={t.allFaculties}
                          />
                        </div>
                      ) : null}
                      {majorOptions.length > 0 ? (
                        <div className="w-44">
                          <CustomSelect
                            value={state.filters.majorId ?? ""}
                            onChange={(val) =>
                              state.applyFilters({
                                ...state.filters,
                                majorId: val || undefined,
                                classId: undefined,
                              })
                            }
                            options={majorOptions}
                            placeholder={t.allMajors}
                          />
                        </div>
                      ) : null}
                      {classOptions.length > 0 ? (
                        <div className="w-44">
                          <CustomSelect
                            value={state.filters.classId ?? ""}
                            onChange={(val) =>
                              state.applyFilters({
                                ...state.filters,
                                classId: val || undefined,
                              })
                            }
                            options={classOptions}
                            placeholder={t.allClasses}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null
                }
                actions={
                  canCreate ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setViewing(null);
                        state.openCreate();
                      }}
                    >
                      <Plus size={15} />
                      {mode === "STAFF"
                        ? t.addStaff
                        : mode === "STUDENT"
                          ? t.addStudent
                          : t.addUser}
                    </Button>
                  ) : null
                }
              />
            }
          />
        </div>
      </div>
      <OpsDetailDrawer
        open={Boolean(viewing) && !state.isModalOpen}
        onClose={() => setViewing(null)}
        title={t.view}
        storageKey={`ops.drawer.width.users.${mode ?? "all"}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewing(null)}>
              {t.cancel}
            </Button>
            {viewing && viewing.status !== "DISABLED" ? (
              <Button
                onClick={() => {
                  const target = viewing;
                  setViewing(null);
                  state.openEdit(target);
                }}
              >
                {t.edit}
              </Button>
            ) : null}
          </>
        }
      >
        {viewing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-[#bfd0e8] bg-[#f0f6fd] p-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#154a9b] text-sm font-bold text-white">
                {viewing.name.trim().charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-bold text-[#102a50]">{viewing.name}</span>
                  {viewing.student?.studentCode ? (
                    <span className="rounded-md bg-[#154a9b] px-2 py-0.5 font-mono text-xs font-semibold text-white">
                      {viewing.student.studentCode}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-[#52647d]">{viewing.email}</p>
              </div>
            </div>
            <div className="space-y-2.5 rounded-xl border border-[#e0e7f0] p-3.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-[#66758a]">{t.faculty}</span>
                <span className="font-medium text-[#102a50]">
                  {viewing.student?.class?.major?.faculty?.name ??
                    viewing.primaryFaculty?.name ??
                    "—"}
                </span>
              </div>
              {viewing.student ? (
                <>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#66758a]">{t.major}</span>
                    <span className="font-medium text-[#102a50]">
                      {viewing.student.class?.major?.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#66758a]">{t.class}</span>
                    <span className="font-medium text-[#102a50]">
                      {viewing.student.class?.name ?? "—"}
                    </span>
                  </div>
                </>
              ) : null}
              <div className="flex justify-between gap-2">
                <span className="text-[#66758a]">{t.status}</span>
                <span className="font-semibold text-[#102a50]">
                  {viewing.status === "ACTIVE" ? t.active : t.disabled}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#66758a]">{t.roles}</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {viewing.userRoles.map(({ role }) => (
                    <span
                      key={role.id}
                      className="rounded bg-[#edf4fc] px-2 py-0.5 text-[11px] font-semibold text-[#154a9b]"
                    >
                      {role.displayName || role.code}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </OpsDetailDrawer>
      <UserDetailDrawer
        open={state.isModalOpen}
        user={state.editing}
        isSelf={Boolean(state.editing && state.editing.id === state.currentUserId)}
        mode={mode}
        roles={state.roles}
        faculties={state.faculties}
        scopedFacultyId={state.scoped ? state.effectiveFacultyId : undefined}
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
        subject={
          state.deleting
            ? `${state.deleting.name}${state.deleting.student?.studentCode ? ` (${state.deleting.student.studentCode})` : ""} — ${state.deleting.email}`
            : ""
        }
      />
    </section>
  );
}
