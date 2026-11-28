"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Input } from "@/components/ui/Input";
import { OpsDetailDrawer } from "@/components/ui/OpsDetailDrawer";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import type { AdminUser, Faculty, Role } from "@/types/admin";

interface UserDetailDrawerProps {
  open: boolean;
  user: AdminUser | null;
  isSelf?: boolean;
  mode?: "STUDENT" | "STAFF";
  roles: Role[];
  faculties: Faculty[];
  scopedFacultyId?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
  apiFieldErrors?: Record<string, string>;
}

export function UserDetailDrawer({
  open,
  user,
  isSelf = false,
  mode,
  roles,
  faculties,
  scopedFacultyId,
  onSubmit,
  onClose,
  saving,
  error,
  apiFieldErrors,
}: UserDetailDrawerProps) {
  const { t } = useAdminTranslations();
  const isStudent = mode === "STUDENT" || Boolean(user?.student);
  const [facultyId, setFacultyId] = useState(
    scopedFacultyId || user?.student?.class?.major?.faculty?.id || user?.primaryFacultyId || "",
  );
  const [majorId, setMajorId] = useState(user?.student?.class?.major?.id ?? "");
  const [classId, setClassId] = useState(user?.student?.classId ?? "");

  useEffect(() => {
    setFacultyId(
      scopedFacultyId || user?.student?.class?.major?.faculty?.id || user?.primaryFacultyId || "",
    );
    setMajorId(user?.student?.class?.major?.id ?? "");
    setClassId(user?.student?.classId ?? "");
  }, [open, scopedFacultyId, user]);

  const selectedFaculty = faculties.find((f) => f.id === facultyId);
  const majorOptions = (selectedFaculty?.majors ?? []).map((m) => ({
    value: m.id,
    label: m.name,
  }));
  const selectedMajor = selectedFaculty?.majors?.find((m) => m.id === majorId);
  const classOptions = (selectedMajor?.classes ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <OpsDetailDrawer
      open={open}
      onClose={onClose}
      title={
        user
          ? t.editUser
          : mode === "STAFF"
            ? t.addStaff
            : mode === "STUDENT"
              ? t.addStudent
              : t.addUser
      }
      storageKey={`ops.drawer.width.users.${mode ?? "all"}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button type="submit" form="user-detail-form" loading={saving}>
            {t.save}
          </Button>
        </>
      }
    >
      <form
        id="user-detail-form"
        key={user?.id ?? "create"}
        onSubmit={onSubmit}
        className="space-y-4"
      >
        {user ? (
          <div className="flex items-center gap-3 rounded-xl border border-[#bfd0e8] bg-[#f0f6fd] p-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#154a9b] text-sm font-bold text-white">
              {user.name.trim().charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-bold text-[#102a50]">{user.name}</span>
                {user.student?.studentCode ? (
                  <span className="rounded-md bg-[#154a9b] px-2 py-0.5 font-mono text-xs font-semibold text-white">
                    {user.student.studentCode}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-[#52647d]">{user.email}</p>
            </div>
          </div>
        ) : null}
        <Input
          label={t.fullName}
          name="name"
          required
          defaultValue={user?.name ?? ""}
          error={apiFieldErrors?.name}
        />
        <Input
          label={t.email}
          name="email"
          type="email"
          required
          defaultValue={user?.email ?? ""}
          error={apiFieldErrors?.email}
        />
        {isStudent ? (
          <>
            <Input
              label={t.studentCode}
              name="studentCode"
              required
              defaultValue={user?.student?.studentCode ?? ""}
              error={apiFieldErrors?.studentCode}
            />
            {faculties.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-[#263b58]">{t.faculty}</p>
                  <CustomSelect
                    value={facultyId}
                    onChange={(val) => {
                      setFacultyId(val);
                      setMajorId("");
                      setClassId("");
                    }}
                    options={faculties.map((f) => ({ value: f.id, label: f.name }))}
                    placeholder={t.allFaculties}
                    disabled={Boolean(scopedFacultyId)}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-[#263b58]">{t.major}</p>
                  <CustomSelect
                    value={majorId}
                    onChange={(val) => {
                      setMajorId(val);
                      setClassId("");
                    }}
                    options={majorOptions}
                    placeholder={t.major}
                    disabled={!facultyId}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-[#263b58]">{t.class}</p>
                  <CustomSelect
                    name="classId"
                    value={classId}
                    onChange={setClassId}
                    options={classOptions}
                    placeholder={t.class}
                    disabled={!majorId}
                  />
                </div>
              </div>
            ) : null}
          </>
        ) : null}
        {!isStudent && faculties.length > 0 ? (
          <div>
            <p className="mb-1.5 text-sm font-semibold text-[#263b58]">{t.faculty}</p>
            <CustomSelect
              name="primaryFacultyId"
              value={facultyId}
              onChange={setFacultyId}
              options={faculties.map((f) => ({ value: f.id, label: f.name }))}
              placeholder={t.allFaculties}
              disabled={Boolean(scopedFacultyId)}
            />
          </div>
        ) : null}
        {roles.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-semibold text-[#263b58]">{t.roles}</p>
            {isSelf ? (
              <p className="mb-2 text-xs text-[#64748b]">{t.cannotAssignSelfRole}</p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {roles.map((role) => {
                const checked = Boolean(
                  user?.userRoles.some(({ role: assigned }) => assigned.id === role.id),
                );
                return (
                  <label
                    key={role.id}
                    className={`flex items-center gap-2 rounded-lg border border-[#dce4ef] p-2.5 text-xs font-medium text-[#263b58] has-[:checked]:border-[#7da1cf] has-[:checked]:bg-[#f0f6fd] ${
                      isSelf
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:border-[#9cb5d5]"
                    }`}
                  >
                    {isSelf && checked ? (
                      <input type="hidden" name="roleIds" value={role.id} />
                    ) : null}
                    <input
                      type="checkbox"
                      name={isSelf ? undefined : "roleIds"}
                      value={role.id}
                      defaultChecked={checked}
                      disabled={isSelf}
                      className="accent-[#154a9b]"
                    />
                    {role.displayName || role.code}
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="rounded-lg bg-[#fff1f2] px-3 py-2 text-xs text-[#b72e3f]">{error}</p>
        ) : null}
      </form>
    </OpsDetailDrawer>
  );
}
