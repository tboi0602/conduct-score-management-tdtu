"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { OpsDetailDrawer } from "@/components/ui/OpsDetailDrawer";
import { SheetTable } from "@/components/ui/SheetTable";
import { SheetToolbar } from "@/components/ui/SheetToolbar";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useToast } from "@/components/ui/ToastProvider";
import { extractServerErrorMessage } from "@/hooks/api/useApi";
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
  const { showToast } = useToast();
  const access = useAdminAccess();
  const queryClient = useQueryClient();
  const [search, setSearch] = useUrlQueryState("search");
  const [roleId, setRoleId] = useUrlQueryState("roleId");
  const [pageRaw, setPageRaw] = useUrlQueryState("page", "1");
  const page = Math.max(1, Number(pageRaw) || 1);
  const setPage = (next: number) => setPageRaw(String(Math.max(1, next)));

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const debouncedSearch = useDebounce(search.trim(), 500);
  const effectiveSearch = debouncedSearch.length > 2 ? debouncedSearch : "";

  const query = useQuery({
    queryKey: queryKeys.roleAssignments.list(page, effectiveSearch, roleId),
    queryFn: () => adminService.listRoleAssignmentUsers(page, effectiveSearch, roleId),
    enabled: !access.isLoading && access.can("faculty-staff.assign-event-organizer"),
  });

  const mutation = useMutation({
    mutationFn: (input: { id: string; roleIds: string[] }) =>
      adminService.updateRoleAssignment(input.id, {
        roleIds: input.roleIds,
      }),
    onSuccess: async () => {
      setEditing(null);
      showToast(t.roleAssignmentSaved);
      await queryClient.invalidateQueries({ queryKey: queryKeys.roleAssignments.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err) => {
      showToast(extractServerErrorMessage(err, t.loadError), "error");
    },
  });

  const current = query.data?.data;
  const activeRole = (current?.filterRoles ?? []).find((role) => role.id === roleId);
  const activeRoleLabel = activeRole
    ? (activeRole as { displayName?: string | null }).displayName || activeRole.code
    : null;
  const hasFilters = Boolean(search.trim() || roleId);

  const clearFilters = () => {
    setSearch("");
    setRoleId("");
    setPage(1);
  };

  const openEdit = (user: AdminUser) => {
    setEditing(user);
    setSelectedRoleIds(user.userRoles.map(({ role }) => role.id));
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
        title: t.user,
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
            <IconButton
              label={t.edit}
              tone="brand"
              className="!h-7 !w-7 !rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(user);
              }}
            >
              <Pencil size={13} />
            </IconButton>
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
              searchPlaceholder={t.searchPlaceholder}
              columns={allColumns}
              hiddenColumnKeys={hiddenKeys}
              onToggleColumn={toggleColumn}
              activeFilters={activeRoleLabel ? [{ key: "role", label: activeRoleLabel }] : []}
              onClearFilters={clearFilters}
              filters={
                <div className="w-48">
                  <CustomSelect
                    value={roleId}
                    onChange={(val) => {
                      setRoleId(val);
                      setPage(1);
                    }}
                    options={(current?.filterRoles ?? []).map((role) => ({
                      value: role.id,
                      label: (role as { displayName?: string | null }).displayName || role.code,
                    }))}
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
        subtitle={
          editing
            ? `${editing.student?.studentCode ? `${editing.student.studentCode} · ` : ""}${editing.name}`
            : undefined
        }
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
          {editing ? (
            <div className="rounded-xl border border-[#bfd0e8] bg-[#f0f6fd] p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-[#102a50]">{editing.name}</span>
                {editing.student?.studentCode ? (
                  <span className="rounded-md bg-[#154a9b] px-2 py-0.5 font-mono text-xs font-semibold text-white">
                    {editing.student.studentCode}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-[#52647d]">{editing.email}</p>
            </div>
          ) : null}
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
