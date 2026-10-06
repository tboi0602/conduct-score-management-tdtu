"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";
import type { AdminUser } from "@/types/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-[#cdd9e7] bg-white px-3 text-sm";

export function UserRoleAssignments() {
  const { locale } = useAdminTranslations();
  const vi = locale === "vi";
  const access = useAdminAccess();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleId, setRoleId] = useState("");
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [primaryFacultyId, setPrimaryFacultyId] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 500);
  const isAdmin = access.profile?.roles.some((role) => role.name === "ADMIN") ?? false;
  const query = useQuery({
    queryKey: ["admin", "role-assignment", page, debouncedSearch, roleId],
    queryFn: () => adminService.listRoleAssignmentUsers(page, debouncedSearch, roleId),
    enabled: !access.isLoading && access.can("faculty-staff.assign-event-organizer"),
  });
  const mutation = useMutation({
    mutationFn: (input: { id: string; roleIds: string[]; primaryFacultyId?: string | null }) =>
      adminService.updateRoleAssignment(input.id, {
        roleIds: input.roleIds,
        ...(input.primaryFacultyId !== undefined
          ? { primaryFacultyId: input.primaryFacultyId }
          : {}),
      }),
    onSuccess: async () => {
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "role-assignment"] });
    },
  });
  const current = query.data?.data;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || !current) return;
    const studentRoleId = current.roles.find((r) => r.name === "STUDENT")?.id;
    const eventOrganizerRoleId = current.roles.find((r) => r.name === "EVENT_ORGANIZER")?.id;
    const isEventOrganizer = eventOrganizerRoleId
      ? selectedRoleIds.includes(eventOrganizerRoleId)
      : false;
    const finalRoleIds =
      editing.student && studentRoleId && !selectedRoleIds.includes(studentRoleId)
        ? [...selectedRoleIds, studentRoleId]
        : selectedRoleIds;
    mutation.mutate({
      id: editing.id,
      roleIds: finalRoleIds,
      ...(!editing.student ? { primaryFacultyId: primaryFacultyId || null } : {}),
    });
  };

  if (access.isLoading || query.isPending) return <PageLoadingSkeleton />;
  if (!access.can("faculty-staff.assign-event-organizer")) {
    return (
      <p className="rounded-xl border border-[#dce4ef] bg-white p-6 text-sm">
        {vi ? "Bạn không có quyền truy cập trang này." : "You do not have access to this page."}
      </p>
    );
  }

  const text = {
    title: vi ? "Phân quyền người dùng" : "User role assignment",
    description: vi
      ? "Danh sách được giới hạn theo khoa phụ trách; tài khoản của bạn và ADMIN được ẩn."
      : "Users are limited to your assigned faculty; your account and ADMIN accounts are hidden.",
    user: vi ? "Người dùng" : "User",
    roles: vi ? "Vai trò" : "Roles",
    faculty: vi ? "Khoa" : "Faculty",
    edit: vi ? "Phân quyền" : "Assign roles",
    save: vi ? "Lưu thay đổi" : "Save changes",
    search: vi ? "Tìm MSSV, họ tên hoặc email" : "Search student ID, name, or email",
    filterRole: vi ? "Lọc theo vai trò" : "Filter by role",
    allRoles: vi ? "Tất cả vai trò" : "All roles",
    student: vi ? "Sinh viên" : "Student",
    staff: vi ? "Cán bộ / giảng viên" : "Staff / lecturer",
    primaryFaculty: vi ? "Khoa trực thuộc" : "Affiliated faculty",
    selectFaculty: vi ? "Chọn khoa trực thuộc" : "Select affiliated faculty",
    studentNote: vi
      ? "Khoa, ngành và lớp của sinh viên được lấy từ hồ sơ học tập và không thể sửa tại đây."
      : "Student faculty, major, and class come from their academic profile and cannot be changed here.",
  };

  return (
    <section>
      <header>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#154a9b]">
          {vi ? "ỦY QUYỀN" : "AUTHORIZATION"}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#102a50]">{text.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#66758a]">{text.description}</p>
      </header>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative block w-full max-w-xl">
          <span className="sr-only">{text.search}</span>
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8ca3]" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={text.search}
            className="min-h-11 w-full rounded-xl border border-[#cdd9e7] pl-10 pr-3 text-sm outline-none focus:border-[#154a9b]"
          />
        </label>
        <label className="block w-full sm:max-w-xs">
          <span className="sr-only">{text.filterRole}</span>
          <select
            aria-label={text.filterRole}
            value={roleId}
            onChange={(event) => {
              setRoleId(event.target.value);
              setPage(1);
            }}
            className="min-h-11 w-full rounded-xl border border-[#cdd9e7] bg-white px-3 text-sm outline-none focus:border-[#154a9b]"
          >
            <option value="">{text.allRoles}</option>
            {(current?.filterRoles ?? []).map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {query.error || mutation.error ? (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {(query.error ?? mutation.error)?.message}
        </p>
      ) : null}
      <div className="mt-5 overflow-x-auto rounded-[22px] border border-[#dce4ef] bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#f7f9fc] text-xs uppercase text-[#718096]">
            <tr>
              <th className="px-5 py-4">{text.user}</th>
              <th className="px-5 py-4">{text.roles}</th>
              <th className="px-5 py-4">{text.faculty}</th>
              <th className="px-5 py-4 text-right">{text.edit}</th>
            </tr>
          </thead>
          <tbody>
            {(current?.items ?? []).map((user) => (
              <tr key={user.id} className="border-t border-[#edf1f5]">
                <td className="px-5 py-4">
                  <strong className="block text-[#263b58]">{user.name}</strong>
                  <span className="text-xs text-[#718096]">
                    {user.student?.studentCode ? `${user.student.studentCode} · ` : ""}
                    {user.email}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.userRoles.map(({ role }) => (
                      <span
                        key={role.id}
                        className="rounded-lg bg-[#eef3f8] px-2 py-1 text-xs font-semibold"
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4">
                  {user.student
                    ? (user.student.class?.major.faculty.name ?? "—")
                    : (user.primaryFaculty?.name ?? "—")}
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(user);
                      setSelectedRoleIds(user.userRoles.map((item) => item.role.id));
                      setPrimaryFacultyId(
                        user.primaryFacultyId ??
                          user.student?.class?.major.faculty.id ??
                          "",
                      );
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#eaf2fb] px-3 py-2 font-semibold text-[#154a9b]"
                  >
                    <Pencil size={15} /> {text.edit}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!current?.items.length ? (
          <p className="p-8 text-center text-sm text-[#718096]">
            {vi ? "Không có người dùng trong phạm vi này." : "No users in this scope."}
          </p>
        ) : null}
        {current ? (
          <PaginationControls
            pagination={current.pagination}
            onPageChange={setPage}
            disabled={query.isFetching}
          />
        ) : null}
      </div>
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={text.edit}>
        {editing && current ? (
          <form key={editing.id} onSubmit={submit} className="space-y-5">
            <div>
              <p className="font-bold text-[#102a50]">{editing.name}</p>
              <p className="text-sm text-[#718096]">{editing.email}</p>
            </div>
            <fieldset>
              <legend className="text-sm font-semibold text-[#263b58]">{text.roles}</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {current.roles
                  .filter((role) => {
                    if (editing.student) {
                      // Student accounts cannot be STUDENT_AFFAIRS
                      return role.name !== "STUDENT_AFFAIRS";
                    }
                    // Non-student accounts cannot have STUDENT role
                    return role.name !== "STUDENT";
                  })
                  .map((role) => {
                    const checked = selectedRoleIds.includes(role.id);
                    const isStudentRole = role.name === "STUDENT";
                    const studentAffairsRoleId = current.roles.find(
                      (r) => r.name === "STUDENT_AFFAIRS",
                    )?.id;
                    const eventOrganizerRoleId = current.roles.find(
                      (r) => r.name === "EVENT_ORGANIZER",
                    )?.id;
                    const isStudentAffairsSelected = studentAffairsRoleId
                      ? selectedRoleIds.includes(studentAffairsRoleId)
                      : false;
                    const isEventOrganizerSelected = eventOrganizerRoleId
                      ? selectedRoleIds.includes(eventOrganizerRoleId)
                      : false;

                    const disabled =
                      Boolean(editing.student && isStudentRole) ||
                      (role.name === "EVENT_ORGANIZER" && isStudentAffairsSelected) ||
                      (role.name === "STUDENT_AFFAIRS" && isEventOrganizerSelected);

                    return (
                      <label
                        key={role.id}
                        className={`flex items-center gap-2 rounded-xl border border-[#dce4ef] p-3 text-sm ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <input
                          type="checkbox"
                          value={role.id}
                          checked={checked}
                          disabled={disabled}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoleIds((prev) => [...prev, role.id]);
                            } else {
                              setSelectedRoleIds((prev) => prev.filter((id) => id !== role.id));
                            }
                          }}
                          className="accent-[#154a9b]"
                        />
                        {role.name}
                      </label>
                    );
                  })}
              </div>
            </fieldset>
            {!editing.student ? (
              <label className="block text-sm font-semibold text-[#263b58]">
                {text.primaryFaculty}
                <div className="mt-2">
                  <CustomSelect
                    name="primaryFacultyId"
                    value={primaryFacultyId}
                    onChange={setPrimaryFacultyId}
                    options={current.faculties.map((faculty) => ({
                      value: faculty.id,
                      label: faculty.name,
                    }))}
                    placeholder={text.selectFaculty}
                  />
                </div>
              </label>
            ) : null}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-xl bg-[#154a9b] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {text.save}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </section>
  );
}
