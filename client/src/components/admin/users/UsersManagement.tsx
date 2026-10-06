"use client";

import { FilterX, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { EmptyTable, TableSkeleton } from "@/components/admin/TableState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useUsersManagement } from "@/hooks/users/useUsersManagement";
import type { AdminUser, Faculty, Role } from "@/types/admin";

const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-[#cdd9e7] bg-white px-3.5 text-sm text-[#263b58] outline-none transition placeholder:text-[#9aa8ba] focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10";

function UserForm({
  user,
  mode,
  roles,
  faculties,
  onSubmit,
  saving,
  error,
}: {
  user: AdminUser | null;
  mode?: "STUDENT" | "STAFF";
  roles: Role[];
  faculties: Faculty[];
  onSubmit: ReturnType<typeof useUsersManagement>["submit"];
  saving: boolean;
  error: string | null;
}) {
  const { t } = useAdminTranslations();
  const initialClass = user?.student?.class;
  const [facultyId, setFacultyId] = useState(initialClass?.major.faculty.id ?? "");
  const [majorId, setMajorId] = useState(initialClass?.major.id ?? "");
  const [classId, setClassId] = useState(user?.student?.classId ?? "");
  const [primaryFacultyId, setPrimaryFacultyId] = useState(user?.primaryFacultyId ?? "");
  const majors = faculties.find((item) => item.id === facultyId)?.majors ?? [];
  const classes = majors.find((item) => item.id === majorId)?.classes ?? [];
  const selectedRoles = new Set(user?.userRoles.flatMap(({ role }) => [role.id, role.name]) ?? []);
  return (
    <form key={user?.id ?? "new"} onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-[#263b58]">
          {t.email}
          <input name="email" required defaultValue={user?.email ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-[#263b58]">
          {t.fullName}
          <input name="name" required defaultValue={user?.name ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-[#263b58]">
          {t.password}
          <input
            name="password"
            type="password"
            required={!user}
            minLength={6}
            placeholder={user ? t.passwordKeep : "Minimum 6 characters"}
            className={inputClass}
          />
        </label>
        {mode !== "STAFF" ? (
          <label className="text-sm font-semibold text-[#263b58]">
            {t.studentCode}
            <input
              name="studentCode"
              defaultValue={user?.student?.studentCode ?? ""}
              className={inputClass}
            />
          </label>
        ) : null}
      </div>
      {!mode ? (
        <fieldset>
          <legend className="text-sm font-semibold text-[#263b58]">{t.role}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {roles.map((role) => (
              <label
                key={role.id}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce4ef] px-3 py-2 text-sm text-[#52647d] transition hover:border-[#9cb5d5] has-[:checked]:border-[#7da1cf] has-[:checked]:bg-[#eef4fc] has-[:checked]:text-[#154a9b]"
              >
                <input
                  type="checkbox"
                  name="roleIds"
                  value={role.id}
                  defaultChecked={selectedRoles.has(role.id)}
                  className="accent-[#154a9b]"
                />
                {role.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : mode === "STAFF" ? (
        <fieldset>
          <legend className="text-sm font-semibold text-[#263b58]">{t.role}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {roles
              .filter((role) => role.name === "EVENT_ORGANIZER" || role.name === "STUDENT_AFFAIRS")
              .map((role) => (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce4ef] px-3 py-2 text-sm text-[#52647d] transition hover:border-[#9cb5d5] has-[:checked]:border-[#7da1cf] has-[:checked]:bg-[#eef4fc] has-[:checked]:text-[#154a9b]"
                >
                  <input
                    type="radio"
                    name="roleIds"
                    value={role.id}
                    defaultChecked={
                      selectedRoles.has(role.id) || (!user && role.name === "EVENT_ORGANIZER")
                    }
                    className="accent-[#154a9b]"
                  />
                  {role.name === "EVENT_ORGANIZER"
                    ? "Tổ chức sự kiện (EVENT_ORGANIZER)"
                    : "Công tác sinh viên (STUDENT_AFFAIRS)"}
                </label>
              ))}
          </div>
        </fieldset>
      ) : null}
      {!mode || mode === "STAFF" ? (
        <div className="text-sm font-semibold text-[#263b58]">
          Khoa trực thuộc
          <CustomSelect
            name="primaryFacultyId"
            value={primaryFacultyId}
            onChange={setPrimaryFacultyId}
            options={faculties.map((item) => ({
              value: item.id,
              label: `${item.code} — ${item.name}`,
            }))}
            placeholder="Chọn khoa trực thuộc"
            className="mt-2"
          />
          <p className="mt-2 text-xs font-normal text-[#66758a]">
            Sinh viên sử dụng khoa suy ra từ lớp; giá trị này áp dụng cho tài khoản cán bộ và giảng
            viên.
          </p>
        </div>
      ) : null}
      {mode !== "STAFF" ? (
        <fieldset className="rounded-2xl border border-[#e0e7f0] bg-[#f8fafc] p-4">
          <legend className="px-2 text-sm font-semibold text-[#263b58]">{t.academic}</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-xs font-semibold text-[#66758a]">
              {t.faculty}
              <CustomSelect
                value={facultyId}
                onChange={(value) => {
                  setFacultyId(value);
                  setMajorId("");
                  setClassId("");
                }}
                options={faculties.map((item) => ({
                  value: item.id,
                  label: `${item.code} — ${item.name}`,
                }))}
                placeholder={t.allFaculties}
                className="mt-2"
              />
            </div>
            <div className="text-xs font-semibold text-[#66758a]">
              {t.major}
              <CustomSelect
                value={majorId}
                onChange={(value) => {
                  setMajorId(value);
                  setClassId("");
                }}
                disabled={!facultyId}
                options={majors.map((item) => ({
                  value: item.id,
                  label: `${item.code} — ${item.name}`,
                }))}
                placeholder={t.allMajors}
                className="mt-2"
              />
            </div>
            <div className="text-xs font-semibold text-[#66758a]">
              {t.class}
              <CustomSelect
                name="classId"
                value={classId}
                onChange={setClassId}
                disabled={!majorId}
                options={classes.map((item) => ({
                  value: item.id,
                  label: `${item.code} — ${item.name}`,
                }))}
                placeholder={t.selectClass}
                className="mt-2"
              />
            </div>
          </div>
        </fieldset>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-xl bg-[#fff1f2] px-4 py-3 text-sm text-[#b72e3f]">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <button
          disabled={saving}
          className="rounded-xl bg-[#154a9b] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(21,74,155,.75)] transition hover:bg-[#103f86] active:scale-[.98] disabled:opacity-50"
        >
          {saving ? `${t.saving}...` : t.save}
        </button>
      </div>
    </form>
  );
}

export function UsersManagement({ mode }: { mode?: "STUDENT" | "STAFF" }) {
  const state = useUsersManagement(mode);
  const { t, locale } = useAdminTranslations();
  const [facultyId, setFacultyId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [classId, setClassId] = useState("");
  const [roleId, setRoleId] = useState("");
  const majors = useMemo(
    () => state.faculties.find((item) => item.id === facultyId)?.majors ?? [],
    [facultyId, state.faculties],
  );
  const classes = useMemo(
    () => majors.find((item) => item.id === majorId)?.classes ?? [],
    [majorId, majors],
  );
  const apply = (next = { facultyId, majorId, classId, roleId }) =>
    state.applyFilters({ ...next, search: state.filters.search });
  const clear = () => {
    setFacultyId("");
    setMajorId("");
    setClassId("");
    setRoleId("");
    state.setSearchTerm("");
    state.applyFilters({});
  };
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
          mode ? undefined : (
            <button
              type="button"
              onClick={state.openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#154a9b] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_28px_-14px_rgba(21,74,155,.7)] transition hover:-translate-y-0.5 hover:bg-[#103f86] active:translate-y-0 active:scale-[.98]"
            >
              <Plus size={17} />
              {t.addUser}
            </button>
          )
        }
      />
      <div className="mt-7 rounded-[22px] border border-[#dce4ef] bg-white p-4 shadow-[0_18px_40px_-28px_rgba(31,67,111,.35)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(4,1fr)_auto]">
          <label className="relative">
            <span className="sr-only">{t.search}</span>
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8ca3]"
            />
            <input
              value={state.searchTerm}
              onChange={(event) => state.setSearchTerm(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="min-h-11 w-full rounded-xl border border-[#cdd9e7] pl-10 pr-3 text-sm outline-none transition focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10"
            />
          </label>
          {!mode ? (
            <>
              <CustomSelect
                value={facultyId}
                onChange={(value) => {
                  setFacultyId(value);
                  setMajorId("");
                  setClassId("");
                  apply({ facultyId: value, majorId: "", classId: "", roleId });
                }}
                options={state.faculties.map((item) => ({
                  value: item.id,
                  label: `${item.code} — ${item.name}`,
                }))}
                placeholder={t.allFaculties}
              />
              <CustomSelect
                value={majorId}
                onChange={(value) => {
                  setMajorId(value);
                  setClassId("");
                  apply({ facultyId, majorId: value, classId: "", roleId });
                }}
                disabled={!facultyId}
                options={majors.map((item) => ({
                  value: item.id,
                  label: `${item.code} — ${item.name}`,
                }))}
                placeholder={t.allMajors}
              />
              <CustomSelect
                value={classId}
                onChange={(value) => {
                  setClassId(value);
                  apply({ facultyId, majorId, classId: value, roleId });
                }}
                disabled={!majorId}
                options={classes.map((item) => ({ value: item.id, label: item.code }))}
                placeholder={t.allClasses}
              />
              <CustomSelect
                value={roleId}
                onChange={(value) => {
                  setRoleId(value);
                  apply({ facultyId, majorId, classId, roleId: value });
                }}
                options={state.roles.map((item) => ({ value: item.id, label: item.name }))}
                placeholder={t.allRoles}
              />
              <IconButton label={t.clearFilter} onClick={clear}>
                <FilterX size={17} />
              </IconButton>
            </>
          ) : null}
        </div>
      </div>
      {state.actionError && !state.isModalOpen ? (
        <p role="alert" className="mt-4 rounded-xl bg-[#fff1f2] px-4 py-3 text-sm text-[#b72e3f]">
          {state.actionError}
        </p>
      ) : null}
      <div className="mt-5 overflow-hidden rounded-[22px] border border-[#dce4ef] bg-white shadow-[0_18px_45px_-30px_rgba(31,67,111,.4)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-[#f7f9fc] text-[11px] uppercase tracking-[.1em] text-[#68788d]">
              <tr>
                <th className="w-20 px-5 py-4 text-center">{t.ordinal}</th>
                <th className="px-5 py-4">{t.user}</th>
                <th className="px-5 py-4">{t.role}</th>
                <th className="px-5 py-4">{t.studentCode}</th>
                <th className="px-5 py-4">{t.faculty}</th>
                <th className="px-5 py-4">{t.major}</th>
                <th className="px-5 py-4">{t.class}</th>
                <th className="px-5 py-4">{t.createdAt}</th>
                <th className="px-5 py-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            {state.isLoading ? (
              <TableSkeleton columns={9} />
            ) : (
              <tbody className="divide-y divide-[#e7ecf3]">
                {state.items.map((user, index) => {
                  const academic = user.student?.class;
                  return (
                    <tr key={user.id} className="transition-colors hover:bg-[#f9fbfd]">
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
      <Modal
        open={state.isModalOpen}
        onClose={state.closeModal}
        title={state.editing ? t.editUser : t.addUser}
        description={t.userDescription}
        size="xl"
      >
        <UserForm
          key={state.editing?.id ?? "new"}
          user={state.editing}
          mode={mode}
          roles={state.roles}
          faculties={state.faculties}
          onSubmit={state.submit}
          saving={state.isSaving}
          error={state.actionError}
        />
      </Modal>
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
