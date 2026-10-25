"use client";

import { Pencil, Trash2 } from "lucide-react";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { SelectionCheckbox } from "@/components/admin/SelectionCheckbox";
import { EmptyTable, TableSkeleton } from "@/components/admin/TableState";
import { IconButton } from "@/components/ui/IconButton";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { usePageSelection } from "@/hooks/shared/usePageSelection";
import { useUsersManagement } from "@/hooks/users/useUsersManagement";

type UsersTableProps = {
  mode?: "STUDENT" | "STAFF";
  state: ReturnType<typeof useUsersManagement>;
  selectableIds: string[];
  selection: ReturnType<typeof usePageSelection>;
};

export function UsersTable({ mode, state, selectableIds, selection }: UsersTableProps) {
  const { t, locale } = useAdminTranslations();

  return (
    <div className="mt-5 overflow-hidden rounded-[22px] border border-[#dce4ef] bg-white shadow-[0_18px_45px_-30px_rgba(31,67,111,.4)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-[#f7f9fc] text-[11px] uppercase tracking-[.1em] text-[#68788d]">
            <tr>
              {selectableIds.length > 0 ? (
                <th className="w-12 px-3 py-4 text-center">
                  <SelectionCheckbox
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected}
                    onChange={selection.toggleAll}
                    label={t.selectAllPage}
                  />
                </th>
              ) : null}
              <th className="w-20 px-5 py-4 text-center">{t.ordinal}</th>
              <th className="px-5 py-4">{t.user}</th>
              <th className="px-5 py-4">{t.role}</th>
              {mode === "STAFF" ? <th className="px-5 py-4">{t.status}</th> : null}
              <th className="px-5 py-4">{t.studentCode}</th>
              <th className="px-5 py-4">{t.faculty}</th>
              <th className="px-5 py-4">{t.major}</th>
              <th className="px-5 py-4">{t.class}</th>
              <th className="px-5 py-4">{t.createdAt}</th>
              <th className="px-5 py-4 text-right">{t.actions}</th>
            </tr>
          </thead>
          {state.isLoading ? (
            <TableSkeleton
              columns={9 + (selectableIds.length > 0 ? 1 : 0) + (mode === "STAFF" ? 1 : 0)}
            />
          ) : (
            <tbody className="divide-y divide-[#e7ecf3]">
              {state.items.map((user, index) => {
                const academic = user.student?.class;
                return (
                  <tr key={user.id} className="transition-colors hover:bg-[#f9fbfd]">
                    {selectableIds.length > 0 ? (
                      <td className="w-12 px-3 py-4 text-center">
                        <SelectionCheckbox
                          checked={selection.selectedSet.has(user.id)}
                          onChange={() => selection.toggle(user.id)}
                          label={`${t.selectRow}: ${user.name}`}
                          disabled={!selectableIds.includes(user.id)}
                        />
                      </td>
                    ) : null}
                    <td className="w-20 px-5 py-4 text-center tabular-nums text-[#66758a]">
                      {(state.pagination.page - 1) * state.pagination.limit + index + 1}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eaf2fb] font-bold text-[#154a9b]">
                          {user.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <strong className="block max-w-52 truncate text-[#102a50]">
                            {user.name}
                          </strong>
                          <span className="mt-1 block max-w-52 truncate text-xs text-[#718096]">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.userRoles.map(({ role }) => (
                          <span
                            key={role.id}
                            className="rounded-lg bg-[#eef3f8] px-2 py-1 text-[11px] font-bold text-[#52647d]"
                          >
                            {role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    {mode === "STAFF" ? (
                      <td className="px-5 py-4">
                        <span
                          className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold ${
                            user.status === "ACTIVE"
                              ? "bg-[#e9f8f0] text-[#16724a]"
                              : "bg-[#fff0f1] text-[#a72a38]"
                          }`}
                        >
                          {user.status === "ACTIVE" ? t.active : t.disabled}
                        </span>
                      </td>
                    ) : null}
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-[#40546f]">
                      {user.student?.studentCode ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-[#52647d]">
                      {academic?.major.faculty.code ?? user.primaryFaculty?.code ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="block max-w-40 truncate text-[#52647d]">
                        {academic?.major.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#52647d]">{academic?.code ?? "—"}</td>
                    <td className="px-5 py-4 text-[#52647d]">
                      {new Date(user.createdAt).toLocaleDateString(
                        locale === "vi" ? "vi-VN" : "en-US",
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <IconButton
                          label={t.edit}
                          tone="brand"
                          onClick={() => state.openEdit(user)}
                        >
                          <Pencil size={16} />
                        </IconButton>
                        {mode === "STAFF" && user.student ? null : (
                          <IconButton
                            label={t.delete}
                            tone="danger"
                            onClick={() => state.setDeleting(user)}
                            disabled={
                              user.userRoles.some(({ role }) => role.name === "ADMIN") ||
                              user.id === state.currentUserId
                            }
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
  );
}
