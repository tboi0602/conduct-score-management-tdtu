"use client";

import { useMemo } from "react";
import { KeyRound, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OpsDetailDrawer } from "@/components/ui/OpsDetailDrawer";
import { SheetTable } from "@/components/ui/SheetTable";
import { SheetToolbar } from "@/components/ui/SheetToolbar";
import { Input } from "@/components/ui/Input";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { usePermissionsManagement } from "@/hooks/rbac/usePermissionsManagement";
import { useUrlQueryState } from "@/hooks/shared/useUrlQueryState";
import { useColumns, type ColumnDef } from "@/hooks/ui/useColumns";
import type { Permission } from "@/types/admin";

export function PermissionsManagement() {
  const [search, setSearch] = useUrlQueryState("search");
  const state = usePermissionsManagement(search);
  const { t } = useAdminTranslations();

  const columnDefs = useMemo<ColumnDef<Permission>[]>(
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
        key: "permission",
        title: t.permissionCode,
        width: 260,
        render: (item) => (
          <span className="inline-flex items-center gap-1.5 rounded bg-[#edf4fc] px-2 py-0.5">
            <KeyRound size={12} className="text-[#154a9b]" />
            <code className="text-xs font-bold text-[#154a9b]">{item.permission}</code>
          </span>
        ),
      },
      {
        key: "description",
        title: t.description,
        render: (item) => (
          <span className="text-[#52647d]">{item.description ?? t.noDescription}</span>
        ),
      },
      {
        key: "actions",
        title: t.actions,
        width: 72,
        align: "center",
        sticky: "right",
        render: (item) => (
          <div className="flex justify-center">
            <button
              type="button"
              aria-label={t.edit}
              onClick={(e) => {
                e.stopPropagation();
                state.openEdit(item);
              }}
              className="grid h-6 w-6 place-items-center rounded text-[#154a9b] transition hover:bg-[#edf4fc]"
            >
              <Pencil size={13} />
            </button>
          </div>
        ),
      },
    ],
    [state, t],
  );

  const { allColumns, visibleColumns, hiddenKeys, toggleColumn } = useColumns(
    columnDefs,
    "sheet.columns.permissions",
  );

  return (
    <section className="flex h-dvh w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden">
        <SheetTable
        columns={visibleColumns}
        data={state.items}
        rowKey={(item) => item.id}
        isLoading={state.isLoading}
        error={state.error}
        pagination={state.pagination}
        onPageChange={state.setPage}
        onRowClick={(item) => state.openEdit(item)}
        toolbar={
          <SheetToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t.permissionCode}
            columns={allColumns}
            hiddenColumnKeys={hiddenKeys}
            onToggleColumn={toggleColumn}
          />
        }
      />
      </div>

      <OpsDetailDrawer
        open={state.isModalOpen}
        onClose={state.closeModal}
        title={t.editPermission}
        subtitle={state.editing?.permission}
        storageKey="ops.drawer.width.permissions"
        footer={
          <>
            <Button variant="secondary" onClick={state.closeModal}>
              {t.cancel}
            </Button>
            <Button type="submit" form="permission-edit-form" loading={state.isSaving}>
              {t.save}
            </Button>
          </>
        }
      >
        <form
          id="permission-edit-form"
          key={state.editing?.id ?? "edit"}
          onSubmit={state.submit}
          className="space-y-4"
        >
          <Input
            label={t.permissionCode}
            name="permission"
            required
            readOnly
            defaultValue={state.editing?.permission ?? ""}
            className="font-mono"
          />
          <label className="block text-sm font-semibold text-[#263b58]">
            <span className="mb-1.5 block">{t.description}</span>
            <textarea
              name="description"
              defaultValue={state.editing?.description ?? ""}
              rows={5}
              className="w-full resize-none rounded-lg border border-[#cdd9e7] px-3 py-2 text-sm outline-none transition focus:border-[#154a9b] focus:ring-2 focus:ring-[#154a9b]/15"
            />
          </label>
          {state.actionError ? (
            <p className="rounded-lg bg-[#fff1f2] px-3 py-2 text-xs text-[#b72e3f]">
              {state.actionError}
            </p>
          ) : null}
        </form>
      </OpsDetailDrawer>
    </section>
  );
}
