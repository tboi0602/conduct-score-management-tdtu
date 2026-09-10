"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  subject,
  description,
  pending = false,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subject: string;
  description?: string;
  pending?: boolean;
  error?: string | null;
}) {
  const { t } = useAdminTranslations();
  return (
    <Modal open={open} onClose={pending ? () => {} : onClose} title={title} size="md">
      <div className="flex gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fff0f1] text-[#bd3343]">
          <AlertTriangle size={21} />
        </div>
        <div>
          <p className="font-semibold text-[#102a50]">{subject}</p>
          <p className="mt-1 text-sm text-[#66758a]">{description ?? t.cannotUndo}</p>
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-[#fff1f2] p-3 text-sm text-[#b72e3f]">
          {error}
        </p>
      ) : null}
      <div className="mt-7 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-xl border border-[#d4deeb] px-4 py-2.5 text-sm font-semibold text-[#52647d] transition hover:bg-[#f4f7fa] active:scale-[.98]"
        >
          {t.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="rounded-xl bg-[#bd3343] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a72a38] active:scale-[.98]"
        >
          {pending ? t.deleting : t.confirm}
        </button>
      </div>
    </Modal>
  );
}
