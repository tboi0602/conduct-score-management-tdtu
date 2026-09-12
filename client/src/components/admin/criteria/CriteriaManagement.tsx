"use client";

import { Pencil, Plus, RotateCw, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ManagementTable } from "@/components/admin/ManagementTable";
import { ManagementNotice } from "@/components/admin/ManagementFeedback";
import { primaryButton } from "@/components/admin/management-styles";
import { CriteriaForm } from "@/components/admin/criteria/CriteriaForm";
import { CriteriaFilters } from "@/components/admin/criteria/CriteriaFilters";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useCriteriaManagement } from "@/hooks/criteria/useCriteriaManagement";
import { formatDate, managementError } from "@/lib/event-form";

export function CriteriaManagement() {
  const state = useCriteriaManagement();
  const { can } = useAdminAccess();
  const { t, locale } = useAdminTranslations();
  return (
    <section>
      <AdminPageHeader
        eyebrow={t.activitiesEyebrow}
        title={t.criteriaTitle}
        description={t.criteriaDescription}
        action={
          <div className="flex items-center gap-3">
            <IconButton
              label={t.refreshData}
              onClick={() => void state.reload()}
              disabled={state.isFetching}
            >
              <RotateCw size={17} />
            </IconButton>
            {can("criteria.create") ? (
              <button type="button" onClick={state.openCreate} className={primaryButton}>
                <Plus size={17} />
                {t.addCriteria}
              </button>
            ) : null}
          </div>
        }
      />
      <ManagementNotice notice={state.notice} />
      <CriteriaFilters
        searchTerm={state.searchTerm}
        onSearch={state.setSearchTerm}
        onApply={state.applyFilters}
        onClear={state.clearFilters}
      />
      <ManagementTable
        headers={[
          t.criteriaName,
          t.maxPoints,
          t.defaultPoints,
          t.createdAt,
          t.updatedAt,
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
        {state.items.map((criterion) => (
          <tr key={criterion.id} className="transition-colors hover:bg-[#f9fbfd]">
            <td className="max-w-[320px] break-words px-5 py-4 font-semibold text-[#102a50]">
              {criterion.title}
            </td>
            <td className="px-5 py-4 font-semibold tabular-nums text-[#154a9b]">
              {criterion.maxPoints}
            </td>
            <td className="px-5 py-4 font-semibold tabular-nums text-[#52647d]">
              {criterion.defaultPoints}
            </td>
            <td className="whitespace-nowrap px-5 py-4 text-[#52647d]">
              {formatDate(criterion.createdAt, locale)}
            </td>
            <td className="whitespace-nowrap px-5 py-4 text-[#52647d]">
              {formatDate(criterion.updatedAt, locale)}
            </td>
            <td className="px-5 py-4">
              <div className="flex justify-end gap-2">
                {can("criteria.update") ? (
                  <IconButton label={t.edit} tone="brand" onClick={() => state.openEdit(criterion)}>
                    <Pencil size={16} />
                  </IconButton>
                ) : null}
                {can("criteria.delete") ? (
                  <IconButton
                    label={t.delete}
                    tone="danger"
                    onClick={() => state.openDelete(criterion)}
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
        title={state.editing ? t.editCriteria : t.addCriteria}
        size="md"
      >
        <CriteriaForm
          key={state.editing?.id ?? "new"}
          criterion={state.editing}
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
        title={t.confirmDeleteCriteria}
        subject={state.deleting?.title ?? ""}
        description={t.criteriaDeleteWarning}
        pending={state.isDeleting}
        error={state.actionError ? managementError(state.actionError, t, t.deleteError) : null}
      />
    </section>
  );
}
