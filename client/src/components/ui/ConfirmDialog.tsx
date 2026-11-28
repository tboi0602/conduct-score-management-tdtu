"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  subject,
  description,
  pending = false,
  error,
  confirmLabel,
  cancelLabel,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subject?: string;
  description?: string;
  pending?: boolean;
  error?: string | null;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const { t } = useAdminTranslations();
  return (
    <Modal open={open} onClose={pending ? () => {} : onClose} title={title} size="sm">
      <div className="rounded-lg border border-[#f1d4d8] bg-[#fff8f8] p-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#ffe9ec] text-[#bd3343]">
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            {subject ? <p className="text-sm font-bold text-[#102a50]">{subject}</p> : null}
            <p className="mt-1 text-xs leading-5 text-[#66758a]">{description ?? t.cannotUndo}</p>
          </div>
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-3 rounded-lg bg-[#fff1f2] p-2.5 text-xs text-[#b72e3f]">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-lg border border-[#d4deeb] px-3.5 py-2 text-xs font-semibold text-[#52647d] transition hover:bg-[#f4f7fa] active:scale-[.98]"
        >
          {cancelLabel ?? t.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="rounded-lg bg-[#bd3343] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#a72a38] active:scale-[.98] disabled:opacity-50"
        >
          {pending ? t.deleting : (confirmLabel ?? t.confirm)}
        </button>
      </div>
    </Modal>
  );
}
