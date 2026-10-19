"use client";

import { Eye, EyeOff, FilterX, Pencil, Plus, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { SelectionCheckbox } from "@/components/admin/SelectionCheckbox";
import { EmptyTable, TableSkeleton } from "@/components/admin/TableState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useUsersManagement } from "@/hooks/users/useUsersManagement";
import { usePageSelection } from "@/hooks/shared/usePageSelection";
import type { AdminUser, Faculty, Role } from "@/types/admin";

const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-[#cdd9e7] bg-white px-3.5 text-sm text-[#263b58] outline-none transition placeholder:text-[#9aa8ba] focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10";

type UserFormField =
  "email" | "name" | "password" | "confirmPassword" | "roleIds" | "primaryFacultyId";

type UserFormErrors = Partial<Record<UserFormField, string>>;

function UserForm({
  user,
  mode,
  roles,
  faculties,
  onSubmit,
  onCancel,
  saving,
  error,
  apiFieldErrors,
}: {
  user: AdminUser | null;
  mode?: "STUDENT" | "STAFF";
  roles: Role[];
  faculties: Faculty[];
  onSubmit: ReturnType<typeof useUsersManagement>["submit"];
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  apiFieldErrors: Record<string, string>;
}) {
  const { locale, t } = useAdminTranslations();
  const [fieldErrors, setFieldErrors] = useState<UserFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const initialClass = user?.student?.class;
  const isStudentOrganizer = Boolean(
    mode === "STAFF" &&
    user?.student &&
    user.userRoles.some(({ role }) => role.name === "EVENT_ORGANIZER"),
  );
  const [facultyId, setFacultyId] = useState(initialClass?.major.faculty.id ?? "");
  const [majorId, setMajorId] = useState(initialClass?.major.id ?? "");
  const [classId, setClassId] = useState(user?.student?.classId ?? "");
  const [primaryFacultyId, setPrimaryFacultyId] = useState(user?.primaryFacultyId ?? "");
  const majors = faculties.find((item) => item.id === facultyId)?.majors ?? [];
  const classes = majors.find((item) => item.id === majorId)?.classes ?? [];
  const selectedRoles = new Set(user?.userRoles.flatMap(({ role }) => [role.id, role.name]) ?? []);
  const displayedError = (field: UserFormField) => fieldErrors[field] ?? apiFieldErrors[field];
  const validateStaffForm = (form: FormData): UserFormErrors => {
    if (mode !== "STAFF") return {};
    const errors: UserFormErrors = {};
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const name = String(form.get("name") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmPassword") ?? "");
    if (!email) errors.email = t.emailRequired;
    else if (!isStudentOrganizer && !/^[^@\s]+@tdtu\.edu\.vn$/i.test(email))
      errors.email = t.staffEmailInvalid;
    if (!name) errors.name = t.fullNameRequired;
    if (!user && !password) errors.password = t.passwordRequired;
    else if (password && password.length < 6) errors.password = t.passwordTooShort;
    if (!user && !confirmation) errors.confirmPassword = t.confirmPasswordRequired;
    else if (!user && confirmation !== password) errors.confirmPassword = t.passwordMismatch;
    if (form.getAll("roleIds").length !== 1) errors.roleIds = t.staffRoleRequired;
    if (!isStudentOrganizer && !String(form.get("primaryFacultyId") ?? "")) {
      errors.primaryFacultyId = t.staffFacultyRequired;
    }
    return errors;
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateStaffForm(new FormData(event.currentTarget));
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    void onSubmit(event);
  };
  return (
    <form
      key={user?.id ?? "new"}
      onSubmit={handleSubmit}
      noValidate={mode === "STAFF"}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="text-sm font-semibold text-[#263b58]">
          <label htmlFor="user-form-email">{mode === "STAFF" ? t.staffEmail : t.email}</label>
          <input
            id="user-form-email"
            name="email"
            type={mode === "STAFF" ? "email" : "text"}
            required={mode !== "STAFF"}
            maxLength={150}
            defaultValue={user?.email ?? ""}
            readOnly={isStudentOrganizer}
            aria-invalid={Boolean(displayedError("email"))}
            aria-describedby={displayedError("email") ? "user-form-email-error" : undefined}
            className={`${inputClass} ${isStudentOrganizer ? "cursor-not-allowed bg-[#f3f6fa] text-[#66758a]" : ""}`}
          />
          {mode === "STAFF" && !isStudentOrganizer && !displayedError("email") ? (
            <p className="mt-2 text-xs font-normal text-[#66758a]">{t.staffEmailHint}</p>
          ) : null}
          {displayedError("email") ? (
            <p id="user-form-email-error" role="alert" className="mt-2 text-xs text-[#b72e3f]">
              {displayedError("email")}
            </p>
          ) : null}
        </div>
        <div className="text-sm font-semibold text-[#263b58]">
          <label htmlFor="user-form-name">{t.fullName}</label>
          <input
            id="user-form-name"
            name="name"
            required={mode !== "STAFF"}
            maxLength={100}
            defaultValue={user?.name ?? ""}
            aria-invalid={Boolean(displayedError("name"))}
            aria-describedby={displayedError("name") ? "user-form-name-error" : undefined}
            className={inputClass}
          />
          {displayedError("name") ? (
            <p id="user-form-name-error" role="alert" className="mt-2 text-xs text-[#b72e3f]">
              {displayedError("name")}
            </p>
          ) : null}
        </div>
        <div className="text-sm font-semibold text-[#263b58]">
          <label htmlFor="user-form-password">{t.password}</label>
          <div className="relative">
            <input
              id="user-form-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required={mode !== "STAFF" && !user}
              minLength={6}
              placeholder={user ? t.passwordKeep : t.passwordMinimum}
              aria-invalid={Boolean(displayedError("password"))}
              aria-describedby={displayedError("password") ? "user-form-password-error" : undefined}
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? t.hidePassword : t.showPassword}
              className="absolute right-3 top-[calc(50%+4px)] grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#66758a] transition hover:bg-[#edf2f8] hover:text-[#154a9b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#154a9b]/30"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {displayedError("password") ? (
            <p id="user-form-password-error" role="alert" className="mt-2 text-xs text-[#b72e3f]">
              {displayedError("password")}
            </p>
          ) : null}
        </div>
        {mode === "STAFF" && !user ? (
          <div className="text-sm font-semibold text-[#263b58]">
            <label htmlFor="user-form-confirm-password">{t.confirmPassword}</label>
            <div className="relative">
              <input
                id="user-form-confirm-password"
                name="confirmPassword"
                type={showConfirmation ? "text" : "password"}
                minLength={6}
                placeholder={t.passwordMinimum}
                aria-invalid={Boolean(displayedError("confirmPassword"))}
                aria-describedby={
                  displayedError("confirmPassword") ? "user-form-confirm-password-error" : undefined
                }
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmation((current) => !current)}
                aria-label={showConfirmation ? t.hidePassword : t.showPassword}
                className="absolute right-3 top-[calc(50%+4px)] grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#66758a] transition hover:bg-[#edf2f8] hover:text-[#154a9b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#154a9b]/30"
              >
                {showConfirmation ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {displayedError("confirmPassword") ? (
              <p
                id="user-form-confirm-password-error"
                role="alert"
                className="mt-2 text-xs text-[#b72e3f]"
              >
                {displayedError("confirmPassword")}
              </p>
            ) : null}
          </div>
        ) : null}
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
        <fieldset aria-describedby={displayedError("roleIds") ? "staff-role-error" : undefined}>
          <legend className="text-sm font-semibold text-[#263b58]">{t.role}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {roles
              .filter((role) =>
                isStudentOrganizer
                  ? role.name === "EVENT_ORGANIZER"
                  : role.name === "EVENT_ORGANIZER" || role.name === "STUDENT_AFFAIRS",
              )
              .map((role) => (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce4ef] px-3 py-2 text-sm text-[#52647d] transition hover:border-[#9cb5d5] has-[:checked]:border-[#7da1cf] has-[:checked]:bg-[#eef4fc] has-[:checked]:text-[#154a9b]"
                >
                  <input
                    type="radio"
                    name="roleIds"
                    value={role.id}
                    defaultChecked={selectedRoles.has(role.id)}
                    className="accent-[#154a9b]"
                  />
                  {role.name === "EVENT_ORGANIZER" ? t.eventOrganizerRole : t.studentAffairsRole}
                </label>
              ))}
          </div>
          {displayedError("roleIds") ? (
            <p id="staff-role-error" role="alert" className="mt-2 text-xs text-[#b72e3f]">
              {displayedError("roleIds")}
            </p>
          ) : null}
        </fieldset>
      ) : null}
      {!mode || mode === "STAFF" ? (
        <div className="text-sm font-semibold text-[#263b58]">
          {mode === "STAFF" ? t.affiliatedFaculty : t.faculty}
          {isStudentOrganizer ? (
            <div className="mt-2 min-h-11 rounded-xl border border-[#dce4ef] bg-[#f3f6fa] px-3.5 py-3 text-sm font-normal text-[#66758a]">
              {initialClass
                ? `${initialClass.major.faculty.code} — ${initialClass.major.faculty.name}`
                : "—"}
            </div>
          ) : (
            <CustomSelect
              name="primaryFacultyId"
              value={primaryFacultyId}
              onChange={setPrimaryFacultyId}
              options={faculties.map((item) => ({
                value: item.id,
                label: `${item.code} — ${item.name}`,
              }))}
              placeholder={t.selectAffiliatedFaculty}
              ariaLabel={t.affiliatedFaculty}
              className="mt-2"
            />
          )}
          {displayedError("primaryFacultyId") ? (
            <p role="alert" className="mt-2 text-xs font-normal text-[#b72e3f]">
              {displayedError("primaryFacultyId")}
            </p>
          ) : (
            <p className="mt-2 text-xs font-normal text-[#66758a]">
              {mode === "STAFF"
                ? isStudentOrganizer
                  ? locale === "vi"
                    ? "Khoa được xác định từ lớp của sinh viên và không thay đổi tại đây."
                    : "The faculty is derived from the student's class and cannot be changed here."
                  : t.staffFacultyHelp
                : locale === "vi"
                  ? "Sinh viên sử dụng khoa suy ra từ lớp; giá trị này áp dụng cho tài khoản cán bộ và giảng viên."
                  : "A student's faculty is derived from their class; this value applies to staff and lecturer accounts."}
            </p>
          )}
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
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-[#cdd9e7] bg-white px-5 py-3 text-sm font-bold text-[#52647d] transition hover:border-[#9eb3cd] hover:bg-[#f7f9fc] active:scale-[.98] disabled:opacity-50"
        >
          {t.cancel}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#154a9b] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(21,74,155,.75)] transition hover:bg-[#103f86] active:scale-[.98] disabled:opacity-50"
        >
          {saving ? `${t.saving}...` : mode === "STAFF" && !user ? t.addStaff : t.save}
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
  const [bulkAction, setBulkAction] = useState<"delete" | "activate" | "disable" | null>(null);
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
  const canCreate = !mode || (mode === "STAFF" && state.canCreateStaff);
  const confirmBulkAction = async () => {
    if (!bulkAction) return;
    try {
      const itemCount = state.items.length;
      let deletedCount = 0;
      if (bulkAction === "delete") {
        const response = await state.bulkDeleteStudents.mutateAsync(selection.selectedIds);
        deletedCount = response.data.succeededIds.length;
      } else if (bulkAction === "activate") {
        await state.bulkActivateStaff.mutateAsync(selection.selectedIds);
      } else {
        await state.bulkDisableStaff.mutateAsync(selection.selectedIds);
      }
      if (deletedCount >= itemCount && !state.pagination.hasNextPage && state.page > 1) {
        state.setPage(state.page - 1);
      }
      selection.clear();
      setBulkAction(null);
    } catch {
      // The shared mutation reports a localized error and keeps the dialog open.
    }
  };
  const bulkPending =
    state.bulkDeleteStudents.isPending ||
    state.bulkActivateStaff.isPending ||
    state.bulkDisableStaff.isPending;
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
      <BulkActionBar count={selection.selectedIds.length} onClear={selection.clear}>
        {mode === "STUDENT" ? (
          <button
            type="button"
            onClick={() => setBulkAction("delete")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#bd3343] px-4 py-2 text-sm font-bold text-white hover:bg-[#a72a38]"
          >
            <Trash2 size={16} /> {t.deleteSelected}
          </button>
        ) : null}
        {mode === "STAFF" ? (
          <>
            <button
              type="button"
              onClick={() => setBulkAction("activate")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1f7a4d] px-4 py-2 text-sm font-bold text-white hover:bg-[#17643f]"
            >
              <UserCheck size={16} /> {t.activateSelected}
            </button>
            <button
              type="button"
              onClick={() => setBulkAction("disable")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#bd3343] px-4 py-2 text-sm font-bold text-white hover:bg-[#a72a38]"
            >
              <UserX size={16} /> {t.disableSelected}
            </button>
          </>
        ) : null}
      </BulkActionBar>
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
      <Modal
        open={state.isModalOpen}
        onClose={state.closeModal}
        title={
          mode === "STAFF"
            ? state.editing
              ? t.editStaff
              : t.addStaff
            : state.editing
              ? t.editUser
              : t.addUser
        }
        description={mode === "STAFF" ? t.staffDescription : t.userDescription}
        size="xl"
      >
        <UserForm
          key={state.editing?.id ?? "new"}
          user={state.editing}
          mode={mode}
          roles={state.roles}
          faculties={state.faculties}
          onSubmit={state.submit}
          onCancel={state.closeModal}
          saving={state.isSaving}
          error={state.actionError}
          apiFieldErrors={state.actionFieldErrors}
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(state.deleting)}
        onClose={() => state.setDeleting(null)}
        onConfirm={state.confirmDelete}
        title={t.confirmDeleteUser}
        subject={state.deleting?.email ?? ""}
      />
      <ConfirmDialog
        open={Boolean(bulkAction)}
        onClose={() => setBulkAction(null)}
        onConfirm={() => void confirmBulkAction()}
        title={
          bulkAction === "activate"
            ? t.confirmActivateSelected
            : bulkAction === "disable"
              ? t.confirmDisableSelected
              : t.confirmDeleteSelected
        }
        subject={t.selectedCount.replace("{count}", String(selection.selectedIds.length))}
        description={
          bulkAction === "delete"
            ? t.confirmDeleteSelectedDescription
            : t.confirmStaffStatusDescription
        }
        pending={bulkPending}
        confirmLabel={
          bulkAction === "activate"
            ? t.activateSelected
            : bulkAction === "disable"
              ? t.disableSelected
              : t.deleteSelected
        }
      />
    </section>
  );
}
