"use client";

import { FileSpreadsheet, Upload } from "lucide-react";
import { useState } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Modal } from "@/components/ui/Modal";
import { useAttendanceImport } from "@/hooks/attendance/useAttendanceImport";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { attendanceMessages } from "@/i18n/attendance-messages";
import type { AttendanceDirection } from "@/types/attendance";

export function AttendanceImportAction({
  eventId,
  checkInMode,
}: {
  eventId: string;
  checkInMode: "ONE_WAY" | "TWO_WAY";
}) {
  const { locale } = useAdminTranslations();
  const t = attendanceMessages[locale];
  const state = useAttendanceImport(eventId);
  const [direction, setDirection] = useState<AttendanceDirection>("CHECK_IN");
  const [status, setStatus] = useState<"ATTENDED" | "LATE">("ATTENDED");
  return (
    <>
      <button
        type="button"
        onClick={() => state.setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#b9cbe0] bg-white px-4 text-sm font-bold text-[#154a9b] transition hover:bg-[#edf4fc] active:scale-[.98]"
      >
        <FileSpreadsheet size={18} /> {t.importAttendance}
      </button>
      <Modal
        open={state.open}
        onClose={state.close}
        title={t.importTitle}
        description={t.importDescription}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <CustomSelect
            ariaLabel={t.direction}
            placeholder={t.direction}
            value={direction}
            onChange={(value) => setDirection(value as AttendanceDirection)}
            options={[
              { value: "CHECK_IN", label: t.checkIn },
              ...(checkInMode === "TWO_WAY" ? [{ value: "CHECK_OUT", label: t.checkOut }] : []),
            ]}
          />
          <CustomSelect
            ariaLabel={t.result}
            placeholder={t.result}
            value={status}
            onChange={(value) => setStatus(value as "ATTENDED" | "LATE")}
            options={[
              { value: "ATTENDED", label: t.attended },
              { value: "LATE", label: t.late },
            ]}
          />
        </div>
        <label className="mt-5 flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-[#aebfd3] bg-[#f7f9fc] px-5 py-8 text-center transition hover:border-[#154a9b] hover:bg-[#f0f5fb]">
          <Upload size={28} className="text-[#154a9b]" />
          <strong className="mt-3 text-sm text-[#263b58]">
            {state.fileName || t.importBrowse}
          </strong>
          <span className="mt-1 text-xs leading-5 text-[#718096]">{t.importHint}</span>
          <a
            href="/templates/attendance-import-template.xlsx"
            download
            onClick={(event) => event.stopPropagation()}
            className="mt-2 text-xs font-bold text-[#154a9b] underline underline-offset-2"
          >
            {t.importTemplate}
          </a>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={state.readFile}
            className="sr-only"
          />
        </label>
        {state.fileError ? (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {state.fileError}
          </p>
        ) : null}
        {state.codes.length ? (
          <div className="mt-4 rounded-2xl bg-[#edf4fc] p-4 text-sm text-[#40546f]">
            <p className="font-bold text-[#154a9b]">
              {t.importDetected.replace("{count}", String(state.codes.length))}
            </p>
            {state.duplicateCodes.length ? (
              <p className="mt-2 break-words text-xs">
                {t.importDuplicates}: {state.duplicateCodes.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
        {state.result ? (
          <div className="mt-4 rounded-2xl border border-[#d9e3ee] p-4 text-sm">
            <p className="font-bold text-emerald-700">
              {t.importQueued.replace("{count}", String(state.result.queued))}
            </p>
            <p className="mt-2 text-[#52647d]">
              {t.importRequested}: {state.result.requested} · {t.importQueuedCount}:{" "}
              {state.result.queued}
              {" · "}
              {t.importDuplicateCount}: {state.result.duplicateCodes.length} ·{" "}
              {t.importNotFoundCount}: {state.result.notFoundCodes.length}
            </p>
            {state.result.notFoundCodes.length ? (
              <p className="mt-2 break-words text-[#66758a]">
                {t.importNotFound}: {state.result.notFoundCodes.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={state.close}
            className="min-h-11 rounded-xl border border-[#cbd6e4] px-4 text-sm font-semibold text-[#52647d]"
          >
            {t.close}
          </button>
          <button
            type="button"
            disabled={!state.codes.length || state.mutation.isPending}
            onClick={() => state.mutation.mutate({ direction, status })}
            className="min-h-11 rounded-xl bg-[#154a9b] px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {t.importSubmit}
          </button>
        </div>
      </Modal>
    </>
  );
}
