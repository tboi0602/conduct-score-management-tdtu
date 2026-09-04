"use client";

import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { EmptyTable, TableSkeleton } from "@/components/admin/TableState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";
import { usePermissionsManagement } from "@/hooks/usePermissionsManagement";

export function PermissionsManagement() {
  const state = usePermissionsManagement();
  const { t } = useAdminTranslations();
  return (
    <section>
      <AdminPageHeader
        eyebrow={t.roleEyebrow}
        title={t.permissionTitle}
        description={t.permissionDescription}
        action={
          <button
            type="button"
            onClick={state.openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#154a9b] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_28px_-14px_rgba(21,74,155,.7)] transition hover:-translate-y-0.5 hover:bg-[#103f86] active:translate-y-0 active:scale-[.98]"
          >
            <Plus size={17} />
            {t.addPermission}
          </button>
        }
      />
      {state.actionError && !state.isModalOpen ? (
        <p role="alert" className="mt-5 rounded-xl bg-[#fff1f2] px-4 py-3 text-sm text-[#b72e3f]">
          {state.actionError}
        </p>
      ) : null}
      <div className="mt-7 overflow-hidden rounded-[22px] border border-[#dce4ef] bg-white shadow-[0_18px_45px_-30px_rgba(31,67,111,.4)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#f7f9fc] text-[11px] uppercase tracking-[.1em] text-[#68788d]">
              <tr>
                <th className="px-5 py-4">{t.permissionCode}</th>
                <th className="px-5 py-4">{t.description}</th>
                <th className="px-5 py-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            {state.isLoading ? (
              <TableSkeleton columns={3} />
            ) : (
              <tbody className="divide-y divide-[#e7ecf3]">
                {state.items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-[#f9fbfd]">
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 rounded-xl bg-[#edf4fc] px-3 py-2">
                        <KeyRound size={15} className="text-[#154a9b]" />
                        <code className="text-xs font-bold text-[#154a9b]">{item.permission}</code>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#52647d]">
                      {item.description ?? t.noDescription}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <IconButton
                          label={t.edit}
                          tone="brand"
                          onClick={() => state.openEdit(item)}
                        >
                          <Pencil size={16} />
                        </IconButton>
                        <IconButton
                          label={t.delete}
                          tone="danger"
                          onClick={() => state.setDeleting(item)}
                          disabled={item.permission === "*"}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {!state.isLoading && !state.error && state.items.length === 0 ? (
          <EmptyTable title={t.noData} description={t.tryFilter} />
        ) : null}
        {state.error ? <p className="p-6 text-sm text-[#b72e3f]">{state.error}</p> : null}
        <PaginationControls pagination={state.pagination} onPageChange={state.setPage} />
      </div>
      <Modal
        open={state.isModalOpen}
        onClose={state.closeModal}
        title={state.editing ? t.editPermission : t.addPermission}
        description={t.permissionDescription}
        size="md"
      >
        <form key={state.editing?.id ?? "new"} onSubmit={state.submit} className="space-y-5">
          <label className="block text-sm font-semibold text-[#263b58]">
            {t.permissionCode}
            <input
              name="permission"
              required
              defaultValue={state.editing?.permission ?? ""}
              placeholder="event.create"
              className="mt-2 min-h-11 w-full rounded-xl border border-[#cdd9e7] px-3.5 font-mono text-sm outline-none transition focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10"
            />
          </label>
          <label className="block text-sm font-semibold text-[#263b58]">
            {t.description}
            <textarea
              name="description"
              defaultValue={state.editing?.description ?? ""}
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border border-[#cdd9e7] px-3.5 py-3 text-sm outline-none transition focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10"
            />
          </label>
          {state.actionError ? (
            <p className="rounded-xl bg-[#fff1f2] px-4 py-3 text-sm text-[#b72e3f]">
              {state.actionError}
            </p>
          ) : null}
          <div className="flex justify-end">
            <button
              disabled={state.isSaving}
              className="rounded-xl bg-[#154a9b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#103f86] active:scale-[.98] disabled:opacity-50"
            >
              {state.isSaving ? `${t.saving}...` : t.save}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(state.deleting)}
        onClose={() => state.setDeleting(null)}
        onConfirm={state.confirmDelete}
        title={t.confirmDeletePermission}
        subject={state.deleting?.permission ?? ""}
      />
    </section>
  );
}
