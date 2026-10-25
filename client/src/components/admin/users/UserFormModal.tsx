"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Modal } from "@/components/ui/Modal";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useUsersManagement } from "@/hooks/users/useUsersManagement";
import type { AdminUser, Faculty, Role } from "@/types/admin";

const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-[#cdd9e7] bg-white px-3.5 text-sm text-[#263b58] outline-none transition placeholder:text-[#9aa8ba] focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10";

type UserManagementMode = "STUDENT" | "STAFF";

type UserFormField =
  "email" | "name" | "password" | "confirmPassword" | "roleIds" | "primaryFacultyId";

type UserFormErrors = Partial<Record<UserFormField, string>>;

type UserFormModalProps = {
  open: boolean;
  user: AdminUser | null;
  mode?: UserManagementMode;
  roles: Role[];
  faculties: Faculty[];
  onSubmit: ReturnType<typeof useUsersManagement>["submit"];
  onClose: () => void;
  saving: boolean;
  error: string | null;
  apiFieldErrors: Record<string, string>;
};

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
}: Omit<UserFormModalProps, "open" | "onClose"> & { onCancel: () => void }) {
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
    <form onSubmit={handleSubmit} noValidate={mode === "STAFF"} className="space-y-6">
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

export function UserFormModal(props: UserFormModalProps) {
  const { t } = useAdminTranslations();

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={
        props.mode === "STAFF"
          ? props.user
            ? t.editStaff
            : t.addStaff
          : props.user
            ? t.editUser
            : t.addUser
      }
      description={props.mode === "STAFF" ? t.staffDescription : t.userDescription}
      size="xl"
    >
      <UserForm
        key={props.user?.id ?? "new"}
        user={props.user}
        mode={props.mode}
        roles={props.roles}
        faculties={props.faculties}
        onSubmit={props.onSubmit}
        onCancel={props.onClose}
        saving={props.saving}
        error={props.error}
        apiFieldErrors={props.apiFieldErrors}
      />
    </Modal>
  );
}
