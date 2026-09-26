"use client";

import { Pencil, Plus, RotateCw, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ManagementNotice } from "@/components/admin/ManagementFeedback";
import { ManagementTable } from "@/components/admin/ManagementTable";
import { primaryButton } from "@/components/admin/management-styles";
import { SemesterFilters } from "@/components/admin/semesters/SemesterFilters";
import { SemesterForm } from "@/components/admin/semesters/SemesterForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useSemesterManagement } from "@/hooks/semesters/useSemesterManagement";
import { formatDate, managementError } from "@/lib/event-form";

export function SemestersManagement() {
  const state = useSemesterManagement();
  const { can } = useAdminAccess();
  const { t, locale } = useAdminTranslations();
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
    </section>
  );
}
