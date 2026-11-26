"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { OpsDetailDrawer } from "@/components/ui/OpsDetailDrawer";
import { SheetTable } from "@/components/ui/SheetTable";
import { SheetToolbar } from "@/components/ui/SheetToolbar";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { useUrlQueryState } from "@/hooks/shared/useUrlQueryState";
import { useColumns, type ColumnDef } from "@/hooks/ui/useColumns";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";
import type { AdminUser } from "@/types/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function UserRoleAssignments() {
  const { t, locale } = useAdminTranslations();
  const vi = locale === "vi";
  const access = useAdminAccess();
  const queryClient = useQueryClient();
  const [search, setSearch] = useUrlQueryState("search");
  const [roleId, setRoleId] = useUrlQueryState("roleId");
  const [pageRaw, setPageRaw] = useUrlQueryState("page", "1");
  const page = Math.max(1, Number(pageRaw) || 1);
  const setPage = (next: number) => setPageRaw(String(Math.max(1, next)));

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [primaryFacultyId, setPrimaryFacultyId] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 350);
  const effectiveSearch = debouncedSearch.length > 2 ? debouncedSearch : "";

  const query = useQuery({
    queryKey: ["admin", "role-assignment", page, effectiveSearch, roleId],
    queryFn: () => adminService.listRoleAssignmentUsers(page, effectiveSearch, roleId),
    enabled: !access.isLoading && access.can("faculty-staff.assign-event-organizer"),
  });

  const mutation = useMutation({
    mutationFn: (input: { id: string; roleIds: string[]; primaryFacultyId?: string | null }) =>
      adminService.updateRoleAssignment(input.id, {
        roleIds: input.roleIds,
        ...(input.primaryFacultyId !== undefined
          ? { primaryFacultyId: input.primaryFacultyId }
          : {}),
      }),
    onSuccess: async () => {
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "role-assignment"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });

  const current = query.data?.data;

  const openEdit = (user: AdminUser) => {
    setEditing(user);
    setSelectedRoleIds(user.userRoles.map(({ role }) => role.id));
    setPrimaryFacultyId(user.primaryFacultyId ?? "");
  };

  const toggleRole = (id: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    mutation.mutate({
      id: editing.id,
      roleIds: selectedRoleIds,
      ...(primaryFacultyId ? { primaryFacultyId } : {}),
    });
  };

  const columnDefs = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        key: "ordinal",
        title: t.ordinal,
        width: 64,
        align: "center",
        sticky: "left",
        render: (_row, index) => (
          <span className="tabular-nums text-[#66758a]">{(page - 1) * 50 + index + 1}</span>
        ),
      },
      {
        key: "user",
        title: vi ? "Người dùng" : "User",
        width: 240,
        render: (user) => (
          <div>
            <p className="font-semibold text-[#102a50]">{user.name}</p>
            <p className="text-[11px] text-[#66758a]">
              {user.student?.studentCode ? `${user.student.studentCode} · ` : ""}
              {user.email}
            </p>
          </div>
        ),
      },
      {
        key: "roles",
        title: t.roles,
        render: (user) => (
          <div className="flex flex-wrap gap-1">
            {user.userRoles.map(({ role }) => (
              <span
                key={role.id}
                className="rounded bg-[#edf4fc] px-2 py-0.5 text-[11px] font-semibold text-[#154a9b]"
              >
                {role.displayName || role.code}
              </span>
            ))}
          </div>
        ),
      },
      {
        key: "faculty",
        title: t.faculty,
        width: 220,
        render: (user) => (
          <span className="text-[#52647d]">
            {user.student?.class?.major?.faculty?.name ?? user.primaryFaculty?.name ?? "—"}
          </span>
        ),
      },
      {
        key: "actions",
        title: t.actions,
        width: 72,
        align: "center",
        sticky: "right",
        render: (user) => (
          <div className="flex justify-center">
            <button
              type="button"
              aria-label={t.edit}
              onClick={(e) => {
                e.stopPropagation();
                openEdit(user);
              }}
              className="grid h-6 w-6 place-items-center rounded text-[#154a9b] transition hover:bg-[#edf4fc]"
            >
              <Pencil size={13} />
            </button>
          </div>
        ),
      },
    ],
    [page, t, vi],
  );

  const { allColumns, visibleColumns, hiddenKeys, toggleColumn } = useColumns(
    columnDefs,
    "sheet.columns.role-assignment",
  );

  return (
    <section className="flex h-dvh w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden">
        <SheetTable
          columns={visibleColumns}
          data={current?.items ?? []}
          rowKey={(user) => user.id}
          isLoading={query.isLoading}
          error={query.error instanceof Error ? query.error.message : null}
          pagination={current?.pagination}
          onPageChange={setPage}
          onRowClick={openEdit}
          toolbar={
            <SheetToolbar
              search={search}
              onSearchChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              searchPlaceholder={
                vi ? "Tìm MSSV, họ tên hoặc email..." : "Search student code, name..."
              }
              columns={allColumns}
              hiddenColumnKeys={hiddenKeys}
              onToggleColumn={toggleColumn}
              filters={
                <div className="w-48">
                  <CustomSelect
                    value={roleId}
                    onChange={(val) => {
                      setRoleId(val);
                      setPage(1);
                    }}
                    options={[
                      { value: "", label: t.allRoles },
                      ...(current?.filterRoles ?? []).map((role) => ({
                        value: role.id,
                        label: (role as { displayName?: string | null }).displayName || role.code,
                      })),
                    ]}
                    placeholder={t.allRoles}
                  />
                </div>
              }
            />
          }
        />
      </div>

      <OpsDetailDrawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={t.roleAssignment}
        subtitle={editing ? `${editing.name} (${editing.email})` : undefined}
        storageKey="ops.drawer.width.role-assignment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {t.cancel}
            </Button>
            <Button type="submit" form="role-assignment-form" loading={mutation.isPending}>
              {t.save}
            </Button>
          </>
        }
      >
        <form id="role-assignment-form" onSubmit={submit} className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-[#263b58]">{t.roles}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(current?.roles ?? []).map((role) => {
                const checked = selectedRoleIds.includes(role.id);
                return (
                  <label
                    key={role.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#dce4ef] p-2.5 text-xs font-medium text-[#263b58] hover:border-[#9cb5d5] has-[:checked]:border-[#7da1cf] has-[:checked]:bg-[#f0f6fd]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRole(role.id)}
                      className="accent-[#154a9b]"
                    />
                    {(role as { displayName?: string | null }).displayName || role.code}
                  </label>
                );
              })}
            </div>
          </div>

          {current?.faculties && current.faculties.length > 0 ? (
            <div>
              <p className="mb-1.5 text-sm font-semibold text-[#263b58]">{t.faculty}</p>
              <CustomSelect
                value={primaryFacultyId}
                onChange={setPrimaryFacultyId}
                options={current.faculties.map((faculty) => ({
                  value: faculty.id,
                  label: (faculty as { name?: string }).name ?? faculty.id,
                }))}
                placeholder={t.faculty}
              />
            </div>
          ) : null}

          {mutation.error ? (
            <p className="rounded-lg bg-[#fff1f2] px-3 py-2 text-xs text-[#b72e3f]">
              {mutation.error instanceof Error ? mutation.error.message : t.loadError}
            </p>
          ) : null}
        </form>
      </OpsDetailDrawer>
    </section>
  );
}
