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
    <Modal open={open} onClose={pending ? () => {} : onClose} title={title} size="md">
      <div className="rounded-2xl border border-[#f1d4d8] bg-[#fff8f8] p-4 sm:p-5">
        <div className="flex gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#ffe9ec] text-[#bd3343]">
            <AlertTriangle size={22} />
          </div>
          <div>
            {subject ? <p className="font-bold text-[#102a50]">{subject}</p> : null}
            <p className="mt-1.5 text-sm leading-6 text-[#66758a]">{description ?? t.cannotUndo}</p>
          </div>
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-[#fff1f2] p-3 text-sm text-[#b72e3f]">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-xl border border-[#d4deeb] px-4 py-2.5 text-sm font-semibold text-[#52647d] transition hover:bg-[#f4f7fa] active:scale-[.98]"
        >
          {cancelLabel ?? t.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="rounded-xl bg-[#bd3343] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-16px_rgba(189,51,67,.8)] transition hover:bg-[#a72a38] active:scale-[.98] disabled:opacity-50"
        >
          {pending ? t.deleting : (confirmLabel ?? t.confirm)}
        </button>
      </div>
    </Modal>
  );
}
