"use client";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ManagementTable } from "@/components/admin/ManagementTable";
import { inputClass, primaryButton, secondaryButton } from "@/components/admin/management-styles";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { useAcademicManagement } from "@/hooks/academic/useAcademicManagement";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import type { AcademicKind } from "@/types/admin";

const copy = {
  vi: {
    faculties: { one: "Khoa", title: "Danh mục Khoa" },
    majors: { one: "Ngành", title: "Danh mục Ngành" },
    classes: { one: "Lớp", title: "Danh mục Lớp" },
    group: "Đơn vị đào tạo",
    manage: "Quản lý mã, tên và quan hệ của",
    add: "Thêm",
    search: "Tìm",
    allFaculties: "Tất cả khoa",
    allMajors: "Tất cả ngành",
    code: "Mã",
    name: "Tên",
    parent: "Trực thuộc",
    dependencies: "Số mục phụ thuộc",
    actions: "Thao tác",
    edit: "Sửa",
    remove: "Xóa",
    selectFaculty: "Chọn khoa",
    selectMajor: "Chọn ngành",
    cancel: "Hủy",
    save: "Lưu",
    saving: "Đang lưu",
    deleteHint: "Không thể xóa khi dữ liệu này còn được sử dụng.",
  },
  en: {
    faculties: { one: "Faculty", title: "Faculty catalog" },
    majors: { one: "Major", title: "Major catalog" },
    classes: { one: "Class", title: "Class catalog" },
    group: "Academic units",
    manage: "Manage codes, names, and relationships for",
    add: "Add",
    search: "Search",
    allFaculties: "All faculties",
    allMajors: "All majors",
    code: "Code",
    name: "Name",
    parent: "Parent",
    dependencies: "Dependent records",
    actions: "Actions",
    edit: "Edit",
    remove: "Delete",
    selectFaculty: "Select faculty",
    selectMajor: "Select major",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving",
    deleteHint: "This record cannot be deleted while it is still in use.",
  },
} as const;
export function AcademicManagement({ kind }: { kind: AcademicKind }) {
  const state = useAcademicManagement(kind);
  const { can, profile } = useAdminAccess();
  const { locale } = useAdminTranslations();
  const text = copy[locale];
  const label = text[kind];
  const [formFaculty, setFormFaculty] = useState(
    state.editing?.facultyId ?? state.editing?.major?.faculty.id ?? "",
  );
  const [formMajor, setFormMajor] = useState(state.editing?.majorId ?? "");
  const managesAllFaculties = can("academic.create");
  const scopedFacultyId = managesAllFaculties ? "" : (profile?.effectiveFaculty?.id ?? "");
  const selectedFacultyId = scopedFacultyId || formFaculty;
  const availableFaculties = managesAllFaculties
    ? state.options
    : state.options.filter((faculty) => faculty.id === scopedFacultyId);
  const majors = useMemo(
    () => state.options.find((faculty) => faculty.id === selectedFacultyId)?.majors ?? [],
    [selectedFacultyId, state.options],
  );
  useEffect(() => {
    if (scopedFacultyId) setFormFaculty(scopedFacultyId);
  }, [scopedFacultyId]);
  return (
    <section>
      <AdminPageHeader
        eyebrow={text.group}
        title={label.title}
        description={`${text.manage} ${label.one.toLowerCase()}.`}
        action={
          can("academic.create") || (kind === "classes" && can("academic.class.create")) ? (
            <button
              className={primaryButton}
              onClick={() => {
                setFormFaculty(scopedFacultyId);
                setFormMajor("");
                state.openCreate();
              }}
            >
              <Plus size={17} />
              {text.add} {label.one}
            </button>
          ) : null
        }
      />
      <div className="mt-7 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-3">
        <label className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            className={`${inputClass} mt-0 pl-10`}
            value={state.searchTerm}
            onChange={(event) => state.setSearchTerm(event.target.value)}
            placeholder={`${text.search} ${label.one.toLowerCase()}`}
          />
        </label>
        {kind !== "faculties" && managesAllFaculties ? (
          <CustomSelect
            value={state.facultyId}
            onChange={(value) => {
              state.setFacultyId(value);
              state.setMajorId("");
            }}
            options={availableFaculties.map((faculty) => ({
              value: faculty.id,
              label: `${faculty.code} — ${faculty.name}`,
            }))}
            placeholder={text.allFaculties}
          />
        ) : null}
        {kind === "classes" ? (
          <CustomSelect
            value={state.majorId}
            onChange={state.setMajorId}
            options={(
              state.options.find((faculty) => faculty.id === state.facultyId)?.majors ?? []
            ).map((major) => ({ value: major.id, label: `${major.code} — ${major.name}` }))}
            placeholder={text.allMajors}
            disabled={!state.facultyId}
          />
        ) : null}
      </div>
      <ManagementTable
        headers={[
          text.code,
          `${text.name} ${label.one.toLowerCase()}`,
          text.parent,
          text.dependencies,
          text.actions,
        ]}
        loading={state.isLoading}
        fetching={state.isFetching}
        error={state.requestError}
        count={state.items.length}
        pagination={state.pagination}
        onPageChange={state.setPage}
        retry={() => void state.reload()}
      >
        {state.items.map((item) => (
          <tr key={item.id} className="hover:bg-[#f9fbfd]">
            <td className="px-5 py-4 font-mono font-bold">{item.code}</td>
            <td className="px-5 py-4 font-semibold">{item.name}</td>
            <td className="px-5 py-4">{item.faculty?.name ?? item.major?.name ?? "—"}</td>
            <td className="px-5 py-4">
              {item._count?.majors ?? item._count?.classes ?? item._count?.students ?? 0}
            </td>
            <td className="px-5 py-4">
              <div className="flex justify-end gap-2">
                {can("academic.update") || (kind === "classes" && can("academic.class.update")) ? (
                  <IconButton
                    label={text.edit}
                    tone="brand"
                    onClick={() => {
                      setFormFaculty(item.facultyId ?? item.major?.faculty.id ?? "");
                      setFormMajor(item.majorId ?? "");
                      state.openEdit(item);
                    }}
                  >
                    <Pencil size={16} />
                  </IconButton>
                ) : null}
                {can("academic.delete") ? (
                  <IconButton
                    label={text.remove}
                    tone="danger"
                    onClick={() => state.setDeleting(item)}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </ManagementTable>
      <Modal
        open={state.open}
        onClose={state.close}
        title={`${state.editing ? text.edit : text.add} ${label.one}`}
      >
        <form key={state.editing?.id ?? "new"} onSubmit={state.submit} className="space-y-5">
          <label className="block text-sm font-semibold">
            {text.code}
            <input
              name="code"
              required
              maxLength={50}
              defaultValue={state.editing?.code ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-semibold">
            {text.name}
            <input
              name="name"
              required
              maxLength={150}
              defaultValue={state.editing?.name ?? ""}
              className={inputClass}
            />
          </label>
          {kind !== "faculties" && managesAllFaculties ? (
            <CustomSelect
              name="facultyId"
              value={formFaculty}
              onChange={(value) => {
                setFormFaculty(value);
                setFormMajor("");
              }}
              options={availableFaculties.map((faculty) => ({
                value: faculty.id,
                label: `${faculty.code} — ${faculty.name}`,
              }))}
              placeholder={text.selectFaculty}
            />
          ) : kind !== "faculties" ? (
            <div className="rounded-xl border border-[#d5e0ed] bg-[#f7faff] px-4 py-3">
              <p className="text-xs font-semibold text-[#718096]">{text.parent}</p>
              <p className="mt-1 text-sm font-bold text-[#263b58]">
                {profile?.effectiveFaculty?.name ?? text.selectFaculty}
              </p>
              <input type="hidden" name="facultyId" value={selectedFacultyId} />
            </div>
          ) : null}
          {kind === "classes" ? (
            <CustomSelect
              name="majorId"
              value={formMajor}
              onChange={setFormMajor}
              options={majors.map((major) => ({
                value: major.id,
                label: `${major.code} — ${major.name}`,
              }))}
              placeholder={text.selectMajor}
              disabled={!formFaculty}
            />
          ) : null}
          {state.error ? <p className="text-sm text-[#b72e3f]">{state.error}</p> : null}
          <div className="flex justify-end gap-3">
            <button type="button" className={secondaryButton} onClick={state.close}>
              {text.cancel}
            </button>
            <button className={primaryButton} disabled={state.saving}>
              {state.saving ? text.saving : text.save}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(state.deleting)}
        onClose={() => state.setDeleting(null)}
        onConfirm={state.confirmDelete}
        title={`${text.remove} ${label.one}?`}
        subject={state.deleting?.name ?? ""}
        description={text.deleteHint}
      />
    </section>
  );
}
