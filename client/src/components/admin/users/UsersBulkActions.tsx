"use client";

import { Trash2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { usePageSelection } from "@/hooks/shared/usePageSelection";
import { useUsersManagement } from "@/hooks/users/useUsersManagement";

type BulkAction = "delete" | "activate" | "disable";

type UsersBulkActionsProps = {
  mode?: "STUDENT" | "STAFF";
  state: ReturnType<typeof useUsersManagement>;
  selection: ReturnType<typeof usePageSelection>;
};

export function UsersBulkActions({ mode, state, selection }: UsersBulkActionsProps) {
  const { t } = useAdminTranslations();
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const bulkPending =
    state.bulkDeleteStudents.isPending ||
    state.bulkActivateStaff.isPending ||
    state.bulkDisableStaff.isPending;

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

  return (
    <>
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
    </>
  );
}
