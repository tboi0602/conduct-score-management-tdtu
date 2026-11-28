"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { OpsDetailDrawer } from "@/components/ui/OpsDetailDrawer";
import { SheetTable } from "@/components/ui/SheetTable";
import { SheetToolbar } from "@/components/ui/SheetToolbar";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useRolesManagement } from "@/hooks/rbac/useRolesManagement";
import { useUrlQueryState } from "@/hooks/shared/useUrlQueryState";
import { useColumns, type ColumnDef } from "@/hooks/ui/useColumns";
import { permissionGroupLabels } from "@/i18n/admin-messages";
import type { Role } from "@/types/admin";

export function RolesManagement() {
  const [search, setSearch] = useUrlQueryState("search");
  const state = useRolesManagement(search);
  const { t, locale } = useAdminTranslations();

  const selected = new Set(
    state.editing?.rolePermissions.map(({ permission }) => permission.id) ?? [],
  );
  const [selectedCount, setSelectedCount] = useState(selected.size);
  useEffect(() => {
    setSelectedCount(state.editing?.rolePermissions.length ?? 0);
  }, [state.editing, state.isModalOpen]);

  const protectedRole = state.editing?.code === "ADMIN";

  const openView = (role: Role) => {
    state.closeModal();
    state.setViewing(role);
  };
  const openEditDrawer = (role: Role) => {
    state.setViewing(null);
    state.openEdit(role);
  };
  const openCreateDrawer = () => {
    state.setViewing(null);
    state.openCreate();
  };

  const columnDefs = useMemo<ColumnDef<Role>[]>(
    () => [
      {
        key: "ordinal",
        title: t.ordinal,
        width: 64,
        align: "center",
        sticky: "left",
        render: (_row, index) => (
          <span className="tabular-nums text-[#66758a]">
            {(state.pagination.page - 1) * state.pagination.limit + index + 1}
          </span>
        ),
      },
      {
        key: "code",
        title: t.roleName,
        width: 200,
        render: (role) => (
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#102a50]">
            <ShieldCheck size={14} className="text-[#154a9b]" />
            {role.code}
          </span>
        ),
      },
      {
        key: "displayName",
        title: t.roleDisplayName,
        render: (role) => <span className="text-[#263b58]">{role.displayName || "—"}</span>,
      },
      {
        key: "permissions",
        title: t.permissionCount,
        width: 160,
        render: (role) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openView(role);
            }}
            className="rounded bg-[#edf4fc] px-2 py-0.5 text-xs font-bold text-[#154a9b] transition hover:bg-[#dceafb]"
          >
            {role.rolePermissions.length} {t.permissionGranted}
          </button>
        ),
      },
      {
        key: "users",
        title: t.assignedUsers,
        width: 130,
        align: "center",
        render: (role) => (
          <span className="inline-flex items-center gap-1.5 text-[#52647d]">
            <Users size={14} />
            {role._count.userRoles}
          </span>
        ),
      },
      {
        key: "actions",
        title: t.actions,
        width: 108,
        align: "center",
        sticky: "right",
        render: (role) => (
          <div className="flex justify-center gap-1">
            <IconButton
              label={t.view}
              tone="neutral"
              className="!h-7 !w-7 !rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                openView(role);
              }}
            >
              <Eye size={13} />
            </IconButton>
            <IconButton
              label={t.edit}
              tone="brand"
              className="!h-7 !w-7 !rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                openEditDrawer(role);
              }}
            >
              <Pencil size={13} />
            </IconButton>
            {role.code !== "ADMIN" ? (
              <IconButton
                label={t.delete}
                tone="danger"
                className="!h-7 !w-7 !rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  state.setDeleting(role);
                }}
              >
                <Trash2 size={13} />
              </IconButton>
            ) : null}
          </div>
        ),
      },
    ],
    [state, t],
  );

  const { allColumns, visibleColumns, hiddenKeys, toggleColumn } = useColumns(
    columnDefs,
    "sheet.columns.roles",
  );

  return (
    <section className="flex h-dvh w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden">
        <SheetTable
          columns={visibleColumns}
          data={state.items}
          rowKey={(role) => role.id}
          isLoading={state.isLoading}
          error={state.error}
          pagination={state.pagination}
          onPageChange={state.setPage}
          onRowClick={(role) => openView(role)}
          toolbar={
            <SheetToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={t.roleDisplayName}
              columns={allColumns}
              hiddenColumnKeys={hiddenKeys}
              onToggleColumn={toggleColumn}
              actions={
                <Button size="sm" onClick={openCreateDrawer}>
                  <Plus size={14} />
                  {t.addRole}
                </Button>
              }
            />
          }
        />
      </div>

      <OpsDetailDrawer
        open={state.isModalOpen}
        onClose={state.closeModal}
        title={state.editing ? t.editRole : t.addRole}
        subtitle={state.editing?.displayName || state.editing?.code}
        storageKey="ops.drawer.width.roles"
        defaultWidth={560}
        footer={
          !protectedRole ? (
            <>
              <Button variant="secondary" onClick={state.closeModal}>
                {t.cancel}
              </Button>
              <Button type="submit" form="role-form" loading={state.isSaving}>
                {t.save}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={state.closeModal}>
              {t.cancel}
            </Button>
          )
        }
      >
        <form
          id="role-form"
          key={state.editing?.id ?? "new"}
          onSubmit={state.submit}
          className="space-y-5"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t.roleName}
              name="code"
              required
              defaultValue={state.editing?.code ?? ""}
              disabled={protectedRole}
              placeholder="ORGANIZER"
              className="uppercase"
            />
            <Input
              label={t.roleDisplayName}
              name="displayName"
              defaultValue={state.editing?.displayName ?? ""}
              disabled={protectedRole}
              placeholder={t.roleDisplayPlaceholder}
            />
          </div>
          <fieldset
            disabled={protectedRole}
            onChange={(e) => {
              const boxes = e.currentTarget.querySelectorAll<HTMLInputElement>(
                'input[name="permissionIds"]:checked',
              );
              setSelectedCount(boxes.length);
            }}
          >
            <div className="flex items-center justify-between">
              <legend className="text-sm font-semibold text-[#263b58]">{t.permissionList}</legend>
              <span className="rounded bg-[#edf4fc] px-2 py-0.5 text-xs font-bold text-[#154a9b]">
                {t.selectedLabel}: {selectedCount} / {state.permissions.length}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {Object.entries(
                state.permissions.reduce<Record<string, typeof state.permissions>>((groups, p) => {
                  const key = p.permission === "*" ? "system" : p.permission.split(".")[0];
                  (groups[key] ??= []).push(p);
                  return groups;
                }, {}),
              ).map(([group, perms]) => (
                <div key={group} className="role-perm-group pt-1">
                  <div className="mb-2.5 flex items-center justify-between border-b border-[#eef2f7] pb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#154a9b]">
                      {permissionGroupLabels[locale][group] ?? group} ({perms.length})
                    </span>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#154a9b]">
                      <input
                        type="checkbox"
                        disabled={protectedRole}
                        defaultChecked={perms.length > 0 && perms.every((p) => selected.has(p.id))}
                        onChange={(e) => {
                          const container = e.currentTarget.closest("div.role-perm-group");
                          const boxes = Array.from(
                            container?.querySelectorAll<HTMLInputElement>(
                              'input[name="permissionIds"]',
                            ) ?? [],
                          );
                          boxes.forEach((b) => {
                            b.checked = e.currentTarget.checked;
                          });
                        }}
                        className="accent-[#154a9b] disabled:opacity-50"
                      />
                      {t.selectAll}
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {perms.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer gap-2.5 rounded-lg border border-[#e0e7f0] p-2.5 transition hover:border-[#9cb5d5] has-[:checked]:border-[#7da1cf] has-[:checked]:bg-[#f0f6fd]"
                      >
                        <input
                          type="checkbox"
                          name="permissionIds"
                          value={permission.id}
                          defaultChecked={selected.has(permission.id)}
                          className="mt-0.5 accent-[#154a9b]"
                        />
                        <span>
                          <strong className="block font-mono text-xs text-[#154a9b]">
                            {permission.permission}
                          </strong>
                          <span className="mt-0.5 block text-xs leading-4 text-[#66758a]">
                            {permission.description ?? t.noDescription}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
          {state.actionError ? (
            <p className="rounded-lg bg-[#fff1f2] px-3 py-2 text-xs text-[#b72e3f]">
              {state.actionError}
            </p>
          ) : null}
        </form>
      </OpsDetailDrawer>

      <OpsDetailDrawer
        open={Boolean(state.viewing)}
        onClose={() => state.setViewing(null)}
        title={`${t.permissionDetails}: ${state.viewing?.displayName || state.viewing?.code || ""}`}
        subtitle={state.viewing?.code}
        storageKey="ops.drawer.width.roles.view"
        defaultWidth={520}
      >
        <div className="space-y-3">
          {Object.entries(
            (state.viewing?.rolePermissions ?? []).reduce<
              Record<string, NonNullable<typeof state.viewing>["rolePermissions"]>
            >((groups, item) => {
              const code = item.permission.permission;
              const key = code === "*" ? "system" : code.split(".")[0];
              (groups[key] ??= []).push(item);
              return groups;
            }, {}),
          ).map(([group, items]) => (
            <div key={group} className="pt-1">
              <div className="mb-2 border-b border-[#eef2f7] pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#154a9b]">
                  {permissionGroupLabels[locale][group] ?? group} ({items.length})
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map(({ permission }) => (
                  <div key={permission.id} className="rounded-lg border border-[#e0e7f0] px-3 py-2">
                    <code className="text-xs font-bold text-[#154a9b]">
                      {permission.permission}
                    </code>
                    <p className="mt-0.5 text-xs leading-4 text-[#66758a]">
                      {permission.description ?? t.noDescription}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </OpsDetailDrawer>

      <ConfirmDialog
        open={Boolean(state.deleting)}
        onClose={() => state.setDeleting(null)}
        onConfirm={state.confirmDelete}
        title={t.confirmDeleteRole}
        subject={state.deleting?.displayName || state.deleting?.code || ""}
      />
    </section>
  );
}
