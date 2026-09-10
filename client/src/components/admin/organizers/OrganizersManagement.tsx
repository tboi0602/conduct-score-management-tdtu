"use client";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ManagementTable } from "@/components/admin/ManagementTable";
import { inputClass, primaryButton, secondaryButton } from "@/components/admin/management-styles";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";
import { useOrganizerManagement } from "@/hooks/useOrganizerManagement";
import { organizerLabel } from "@/lib/event-form";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin";
import type { OrganizingUnit } from "@/types/events";

const organizerCopy = {
  vi: {
    eyebrow: "Danh mục",
    title: "Đơn vị tổ chức",
    description: "Tra cứu đơn vị hệ thống và quản lý CLB/Đoàn hội.",
    add: "Thêm CLB/Đoàn hội",
    search: "Tìm theo mã hoặc tên đơn vị",
    code: "Mã",
    name: "Tên đơn vị",
    type: "Loại",
    faculty: "Khoa trực thuộc",
    events: "Sự kiện",
    actions: "Thao tác",
    parent: "Đơn vị trực thuộc",
    university: "Trường TDTU",
    parentHint: "Để trống nếu trực thuộc Trường. Không thể đổi sau khi đơn vị đã có sự kiện.",
    cancel: "Hủy",
    save: "Lưu",
    saving: "Đang lưu",
    edit: "Sửa",
    remove: "Xóa",
    system: "Dữ liệu hệ thống",
    noPermission: "Không có quyền",
    addTitle: "Thêm CLB/Đoàn hội",
    editTitle: "Sửa CLB/Đoàn hội",
    deleteTitle: "Xóa CLB/Đoàn hội?",
    deleteHint: "Chỉ có thể xóa đơn vị chưa được sự kiện nào sử dụng.",
  },
  en: {
    eyebrow: "Catalog",
    title: "Organizing units",
    description: "Browse system units and manage clubs or associations.",
    add: "Add club/association",
    search: "Search by unit code or name",
    code: "Code",
    name: "Unit name",
    type: "Type",
    faculty: "Parent faculty",
    events: "Events",
    actions: "Actions",
    parent: "Parent unit",
    university: "TDTU University",
    parentHint:
      "Leave blank for a university-level unit. Its parent cannot be changed after events use it.",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving",
    edit: "Edit",
    remove: "Delete",
    system: "System data",
    noPermission: "No permission",
    addTitle: "Add club/association",
    editTitle: "Edit club/association",
    deleteTitle: "Delete club/association?",
    deleteHint: "Only units that are not used by any event can be deleted.",
  },
} as const;

function OrganizerForm({
  unit,
  saving,
  submit,
  close,
  copy,
}: {
  unit: OrganizingUnit | null;
  saving: boolean;
  submit: (event: FormEvent<HTMLFormElement>) => void;
  close: () => void;
  copy: (typeof organizerCopy)["vi"] | (typeof organizerCopy)["en"];
}) {
  const [facultyId, setFacultyId] = useState(unit?.facultyId ?? "");
  const faculties =
    useQuery({
      queryKey: queryKeys.academic.options,
      queryFn: adminService.getAcademicOptions,
      staleTime: 60 * 60_000,
    }).data?.data ?? [];
  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block text-sm font-semibold">
        {copy.code}
        <input
          name="code"
          required
          maxLength={50}
          defaultValue={unit?.code ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-semibold">
        {copy.name}
        <input
          name="name"
          required
          maxLength={255}
          defaultValue={unit?.name ?? ""}
          className={inputClass}
        />
      </label>
      <div className="text-sm font-semibold">
        {copy.parent}
        <CustomSelect
          name="facultyId"
          value={facultyId}
          onChange={setFacultyId}
          options={faculties.map((faculty) => ({
            value: faculty.id,
            label: `${faculty.code} — ${faculty.name}`,
          }))}
          placeholder={copy.university}
          className="mt-2"
        />
        <p className="mt-2 text-xs font-normal text-[#66758a]">{copy.parentHint}</p>
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" className={secondaryButton} onClick={close}>
          {copy.cancel}
        </button>
        <button className={primaryButton} disabled={saving}>
          {saving ? copy.saving : copy.save}
        </button>
      </div>
    </form>
  );
}

export function OrganizersManagement() {
  const state = useOrganizerManagement();
  const { can } = useAdminAccess();
  const { locale } = useAdminTranslations();
  const copy = organizerCopy[locale];
  return (
    <section>
      <AdminPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        action={
          can("organizer.create") ? (
            <button className={primaryButton} onClick={state.openCreate}>
              <Plus size={17} />
              {copy.add}
            </button>
          ) : null
        }
      />
      <label className="relative mt-7 block max-w-lg">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718096]" />
        <input
          value={state.searchTerm}
          onChange={(event) => state.setSearchTerm(event.target.value)}
          placeholder={copy.search}
          className={`${inputClass} mt-0 pl-10`}
        />
      </label>
      <ManagementTable
        headers={[copy.code, copy.name, copy.type, copy.faculty, copy.events, copy.actions]}
        loading={state.isLoading}
        fetching={state.isFetching}
        error={state.requestError}
        count={state.items.length}
        pagination={state.pagination}
        onPageChange={state.setPage}
        retry={() => void state.reload()}
      >
        {state.items.map((unit) => (
          <tr key={unit.id} className="hover:bg-[#f9fbfd]">
            <td className="px-5 py-4 font-mono text-xs font-bold">{unit.code}</td>
            <td className="px-5 py-4 font-semibold text-[#102a50]">
              {unit.type === "CLASS" ? (unit.class?.name ?? unit.code) : organizerLabel(unit)}
            </td>
            <td className="px-5 py-4">{unit.type}</td>
            <td className="px-5 py-4">{unit.faculty?.name ?? "—"}</td>
            <td className="px-5 py-4">{unit._count.events}</td>
            <td className="px-5 py-4">
              <div className="flex justify-end gap-2">
                {unit.type === "CLUB" && can("organizer.update") ? (
                  <IconButton label={copy.edit} tone="brand" onClick={() => state.openEdit(unit)}>
                    <Pencil size={16} />
                  </IconButton>
                ) : null}
                {unit.type === "CLUB" && can("organizer.delete") ? (
                  <IconButton
                    label={copy.remove}
                    tone="danger"
                    onClick={() => state.openDelete(unit)}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                ) : null}
                {unit.type !== "CLUB" ? (
                  <span className="whitespace-nowrap rounded-lg bg-[#eef3f8] px-2.5 py-1.5 text-xs font-semibold text-[#66758a]">
                    {copy.system}
                  </span>
                ) : null}
                {unit.type === "CLUB" && !can("organizer.update") && !can("organizer.delete") ? (
                  <span className="text-xs text-[#718096]">{copy.noPermission}</span>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </ManagementTable>
      <Modal
        open={state.isModalOpen}
        onClose={state.closeModal}
        title={state.editing ? copy.editTitle : copy.addTitle}
      >
        <OrganizerForm
          key={state.editing?.id ?? "new"}
          unit={state.editing}
          saving={state.isSaving}
          submit={state.submit}
          close={state.closeModal}
          copy={copy}
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(state.deleting)}
        onClose={state.closeDelete}
        onConfirm={state.confirmDelete}
        title={copy.deleteTitle}
        subject={state.deleting?.name ?? ""}
        description={copy.deleteHint}
        pending={state.isDeleting}
      />
    </section>
  );
}
