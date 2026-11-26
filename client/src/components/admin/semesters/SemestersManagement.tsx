"use client";

import { Pencil, Plus, RotateCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { ManagementNotice } from "@/components/admin/ManagementFeedback";
import { ManagementTable } from "@/components/admin/ManagementTable";
import { SelectionCheckbox } from "@/components/admin/SelectionCheckbox";
import { primaryButton } from "@/components/admin/management-styles";
import { SemesterFilters } from "@/components/admin/semesters/SemesterFilters";
import { SemesterForm } from "@/components/admin/semesters/SemesterForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useSemesterManagement } from "@/hooks/semesters/useSemesterManagement";
import { usePageSelection } from "@/hooks/shared/usePageSelection";
import { formatDate, managementError } from "@/lib/event-form";

export function SemestersManagement() {
  const state = useSemesterManagement();
  const { can } = useAdminAccess();
  const { t, locale } = useAdminTranslations();
  const canDelete = can("semester.delete");
  const selection = usePageSelection(canDelete ? state.items.map((item) => item.id) : []);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const confirmBulkDelete = async () => {
    try {
      const itemCount = state.items.length;
      const response = await state.bulkDelete.mutateAsync(selection.selectedIds);
      if (
        response.data.succeededIds.length >= itemCount &&
        !state.pagination.hasNextPage &&
        state.page > 1
      ) {
        state.setPage(state.page - 1);
      }
      selection.clear();
      setBulkDeleteOpen(false);
    } catch {
      // The shared mutation reports a localized error and keeps the dialog open.
    }
  };
  return (
    <section>
      <AdminPageHeader
        eyebrow={t.activitiesEyebrow}
        title={t.semesterTitle}
        description={t.semesterDescription}
        action={
          <div className="flex items-center gap-3">
            <IconButton
              label={t.refreshData}
              onClick={() => void state.reload()}
              disabled={state.isFetching}
            >
              <RotateCw size={17} />
            </IconButton>
            {can("semester.create") ? (
              <button type="button" onClick={state.openCreate} className={primaryButton}>
                <Plus size={17} /> {t.addSemester}
              </button>
            ) : null}
          </div>
        }
      />
      <ManagementNotice notice={state.notice} />
      <SemesterFilters onApply={state.applyFilters} onClear={state.clearFilters} />
      <BulkActionBar count={selection.selectedIds.length} onClear={selection.clear}>
        <button
          type="button"
          onClick={() => setBulkDeleteOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#bd3343] px-4 py-2 text-sm font-bold text-white hover:bg-[#a72a38]"
        >
          <Trash2 size={16} /> {t.deleteSelected}
        </button>
      </BulkActionBar>
      <ManagementTable
        headers={[
          t.year,
          t.semesterType,
          t.startDate,
          t.endDate,
          t.linkedData,
          t.createdAt,
          t.actions,
        ]}
        leadingHeader={
          canDelete ? (
            <SelectionCheckbox
              checked={selection.allSelected}
              indeterminate={selection.someSelected}
              onChange={selection.toggleAll}
              label={t.selectAllPage}
            />
          ) : undefined
        }
        leadingCell={
          canDelete
            ? (index) => {
                const semester = state.items[index];
                return (
                  <td key="selection" className="w-12 px-3 py-4 text-center">
                    <SelectionCheckbox
                      checked={selection.selectedSet.has(semester.id)}
                      onChange={() => selection.toggle(semester.id)}
                      label={`${t.selectRow}: ${t[semester.type]} ${semester.year}`}
                    />
                  </td>
                );
              }
            : undefined
        }
        loading={state.isLoading}
        fetching={state.isFetching}
        error={state.requestError}
        count={state.items.length}
        pagination={state.pagination}
        onPageChange={state.setPage}
        retry={() => void state.reload()}
      >
        {state.items.map((semester) => (
          <tr key={semester.id} className="transition-colors hover:bg-[#f9fbfd]">
            <td className="px-5 py-4 font-semibold text-[#102a50]">{semester.year}</td>
            <td className="px-5 py-4 font-semibold text-[#154a9b]">{t[semester.type]}</td>
            <td className="whitespace-nowrap px-5 py-4 text-[#52647d]">
              {semester.startDate.slice(0, 10)}
            </td>
            <td className="whitespace-nowrap px-5 py-4 text-[#52647d]">
              {semester.endDate.slice(0, 10)}
            </td>
            <td className="px-5 py-4 text-[#52647d]">
              {semester._count?.events ?? 0} {t.events.toLowerCase()} ·{" "}
              {semester._count?.conductScores ?? 0} {t.trainingPointRecords}
            </td>
            <td className="whitespace-nowrap px-5 py-4 text-[#52647d]">
              {semester.createdAt ? formatDate(semester.createdAt, locale) : "—"}
            </td>
            <td className="px-5 py-4">
              <div className="flex justify-end gap-2">
                {can("semester.update") ? (
                  <IconButton label={t.edit} tone="brand" onClick={() => state.openEdit(semester)}>
                    <Pencil size={16} />
                  </IconButton>
                ) : null}
                {can("semester.delete") ? (
                  <IconButton
                    label={t.delete}
                    tone="danger"
                    onClick={() => state.openDelete(semester)}
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
        open={state.isModalOpen}
        onClose={state.closeModal}
        title={state.editing ? t.editSemester : t.addSemester}
        size="md"
      >
        <SemesterForm
          key={state.editing?.id ?? "new"}
          semester={state.editing}
          saving={state.isSaving}
          error={state.actionError}
          onSubmit={state.submit}
          onCancel={state.closeModal}
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(state.deleting)}
        onClose={state.closeDelete}
        onConfirm={state.confirmDelete}
        title={t.confirmDeleteSemester}
        subject={state.deleting ? `${t[state.deleting.type]} - ${state.deleting.year}` : ""}
        description={t.semesterDeleteWarning}
        pending={state.isDeleting}
        error={state.actionError ? managementError(state.actionError, t, t.deleteError) : null}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => void confirmBulkDelete()}
        title={t.confirmDeleteSelected}
        subject={t.selectedCount.replace("{count}", String(selection.selectedIds.length))}
        description={t.confirmDeleteSelectedDescription}
        pending={state.bulkDelete.isPending}
        confirmLabel={t.deleteSelected}
      />
    </section>
  );
}
