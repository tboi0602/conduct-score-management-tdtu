"use client";

import { Eye, ShieldCheck, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { EmptyTable, TableSkeleton } from "@/components/admin/TableState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useRolesManagement } from "@/hooks/rbac/useRolesManagement";

export function RolesManagement() {
  const state = useRolesManagement();
  const { t } = useAdminTranslations();
  const selected = new Set(
    state.editing?.rolePermissions.map(({ permission }) => permission.id) ?? [],
  );
  const protectedRole = state.editing?.name === "ADMIN";
  return (
    <section>
      <AdminPageHeader
        eyebrow={t.roleEyebrow}
        title={t.roleTitle}
        description={t.roleDescription}
      />
      {state.actionError && !state.isModalOpen ? (
        <p role="alert" className="mt-5 rounded-xl bg-[#fff1f2] px-4 py-3 text-sm text-[#b72e3f]">
          {state.actionError}
        </p>
      ) : null}
      <div className="mt-7 overflow-hidden rounded-[22px] border border-[#dce4ef] bg-white shadow-[0_18px_45px_-30px_rgba(31,67,111,.4)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#f7f9fc] text-[11px] uppercase tracking-[.1em] text-[#68788d]">
              <tr>
                <th className="w-20 px-5 py-4 text-center">{t.ordinal}</th>
                <th className="px-5 py-4">{t.roleName}</th>
                <th className="px-5 py-4">{t.permissionCount}</th>
                <th className="px-5 py-4">{t.assignedUsers}</th>
                <th className="px-5 py-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            {state.isLoading ? (
              <TableSkeleton columns={5} />
            ) : (
              <tbody className="divide-y divide-[#e7ecf3]">
                {state.items.map((role, index) => (
                  <tr key={role.id} className="transition-colors hover:bg-[#f9fbfd]">
                    <td className="w-20 px-5 py-4 text-center tabular-nums text-[#66758a]">
                      {(state.pagination.page - 1) * state.pagination.limit + index + 1}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eaf2fb] text-[#154a9b]">
                          <ShieldCheck size={18} />
                        </span>
                        <strong className="text-[#102a50]">{role.name}</strong>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => state.setViewing(role)}
                        className="rounded-xl bg-[#edf4fc] px-3 py-1.5 text-xs font-bold text-[#154a9b] transition hover:bg-[#dceafb]"
                      >
                        {role.rolePermissions.length} {t.permissionGranted}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 text-[#52647d]">
                        <Users size={16} />
                        {role._count.userRoles}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <IconButton label={t.view} onClick={() => state.setViewing(role)}>
                          <Eye size={16} />
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
        title={state.editing ? t.editRole : t.addRole}
        description={t.roleDescription}
        size="xl"
      >
        <form key={state.editing?.id ?? "new"} onSubmit={state.submit} className="space-y-6">
          <label className="block max-w-md text-sm font-semibold text-[#263b58]">
            {t.roleName}
            <input
              name="name"
              required
              defaultValue={state.editing?.name ?? ""}
              disabled={protectedRole}
              placeholder="ORGANIZER"
              className="mt-2 min-h-11 w-full rounded-xl border border-[#cdd9e7] px-3.5 uppercase outline-none transition focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10 disabled:bg-[#f0f3f7]"
            />
          </label>
          <fieldset disabled={protectedRole}>
            <legend className="text-sm font-semibold text-[#263b58]">{t.permissionList}</legend>
            <div className="mt-3 grid max-h-[48dvh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {state.permissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex cursor-pointer gap-3 rounded-2xl border border-[#e0e7f0] p-3.5 transition hover:border-[#9cb5d5] has-[:checked]:border-[#7da1cf] has-[:checked]:bg-[#f0f6fd]"
                >
                  <input
                    type="checkbox"
                    name="permissionIds"
                    value={permission.id}
                    defaultChecked={selected.has(permission.id)}
                    className="mt-1 accent-[#154a9b]"
                  />
                  <span>
                    <strong className="block font-mono text-xs text-[#154a9b]">
                      {permission.permission}
                    </strong>
                    <span className="mt-1 block text-xs leading-5 text-[#66758a]">
                      {permission.description ?? t.noDescription}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {state.actionError ? (
            <p className="rounded-xl bg-[#fff1f2] px-4 py-3 text-sm text-[#b72e3f]">
              {state.actionError}
            </p>
          ) : null}
          {!protectedRole ? (
            <div className="flex justify-end">
              <button
                disabled={state.isSaving}
                className="rounded-xl bg-[#154a9b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#103f86] active:scale-[.98] disabled:opacity-50"
              >
                {state.isSaving ? `${t.saving}...` : t.save}
              </button>
            </div>
          ) : null}
        </form>
      </Modal>
      <Modal
        open={Boolean(state.viewing)}
        onClose={() => state.setViewing(null)}
        title={`${t.permissionDetails}: ${state.viewing?.name ?? ""}`}
        size="lg"
      >
        <div className="space-y-2">
          {state.viewing?.rolePermissions.map(({ permission }) => (
            <div key={permission.id} className="rounded-2xl border border-[#e0e7f0] px-4 py-3">
              <code className="text-xs font-bold text-[#154a9b]">{permission.permission}</code>
              <p className="mt-1 text-sm text-[#66758a]">
                {permission.description ?? t.noDescription}
              </p>
            </div>
          ))}
        </div>
      </Modal>
      <ConfirmDialog
        open={Boolean(state.deleting)}
        onClose={() => state.setDeleting(null)}
        onConfirm={state.confirmDelete}
        title={t.confirmDeleteRole}
        subject={state.deleting?.name ?? ""}
      />
    </section>
  );
}
