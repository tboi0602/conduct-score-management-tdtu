"use client";

import { FileSpreadsheet, Upload } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Modal } from "@/components/ui/Modal";
import { useAttendanceImport } from "@/hooks/attendance/useAttendanceImport";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { attendanceMessages } from "@/i18n/attendance-messages";

export function AttendanceImportAction({
  eventId,
  disabled = false,
}: {
  eventId: string;
  disabled?: boolean;
}) {
  const { locale } = useAdminTranslations();
  const t = attendanceMessages[locale];
  const state = useAttendanceImport(eventId);
  const tooManyRows = state.totalRows > 5_000;
  const previewStatus = {
    QUALIFIED: t.importQualified,
    BELOW_THRESHOLD: t.importBelowThreshold,
    INVALID_SCORE: t.importInvalidScore,
    INVALID_IDENTIFIER: t.importInvalid,
  } as const;
  const importSummary = [
    { label: t.importTotalRows, value: state.totalRows },
    { label: t.importQualifiedCount, value: state.identifiers.length },
    { label: t.importValidRows, value: state.uniqueValidIdentifiers.length },
    { label: t.importBelowThresholdCount, value: state.belowThresholdCount },
    { label: t.importDuplicateCount, value: state.duplicateIdentifiers.length },
    { label: t.importInvalidScoreCount, value: state.invalidScoreCount },
    { label: t.importInvalidCount, value: state.invalidIdentifiers.length },
  ];
  const importResultMessage = state.result
    ? state.result.queued > 0
      ? t.importSucceeded.replace("{count}", String(state.result.queued))
      : t.importEmpty
    : "";

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => state.setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#b9cbe0] bg-white px-4 text-sm font-bold text-[#154a9b] transition hover:bg-[#edf4fc] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileSpreadsheet size={18} /> {t.importAttendance}
      </button>
      <Modal
        open={state.open}
        onClose={state.close}
        title={t.importTitle}
        description={t.importDescription}
        size="xl"
      >
        <label className="flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-[#aebfd3] bg-[#f7f9fc] px-5 py-7 text-center transition hover:border-[#154a9b] hover:bg-[#f0f5fb]">
          <Upload size={28} className="text-[#154a9b]" />
          <strong className="mt-3 text-sm text-[#263b58]">
            {state.fileName || t.importBrowse}
          </strong>
          <span className="mt-1 text-xs leading-5 text-[#718096]">{t.importHint}</span>
          <input type="file" accept=".csv,text/csv" onChange={state.readFile} className="sr-only" />
        </label>

        {state.fileError ? (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {state.fileError}
          </p>
        ) : null}

        {state.hasRows ? (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#52647d]">{t.importIdentifierColumn}</p>
                <CustomSelect
                  ariaLabel={t.importIdentifierColumn}
                  placeholder={t.importIdentifierColumn}
                  value={String(state.identifierColumnIndex)}
                  onChange={(value) => state.setIdentifierColumnIndex(Number(value))}
                  options={state.columnOptions}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#52647d]">{t.importScoreColumn}</p>
                <CustomSelect
                  ariaLabel={t.importScoreColumn}
                  placeholder={t.importScoreColumn}
                  value={state.scoreColumnIndex === null ? "" : String(state.scoreColumnIndex)}
                  onChange={(value) =>
                    state.setScoreColumnIndex(value === "" ? null : Number(value))
                  }
                  options={state.columnOptions}
                />
              </div>
            </div>
            <label className="mt-4 block max-w-xs space-y-2">
              <span className="text-xs font-bold text-[#52647d]">{t.importMinimumScore}</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={state.minimumScore}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  state.setMinimumScore(Number.isFinite(value) && value >= 0 ? value : 0);
                }}
                className="min-h-11 w-full rounded-xl border border-[#cdd9e7] bg-white px-3.5 text-sm text-[#263b58] outline-none transition focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10"
              />
            </label>
          </>
        ) : null}

        {state.hasRows ? (
          <div className="mt-4 rounded-2xl bg-[#edf4fc] p-4 text-sm text-[#40546f]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {importSummary.map((item) => (
                <div
                  key={item.label}
                  className="flex min-h-[88px] flex-col justify-between rounded-xl border border-[#d4e0ee] bg-white p-3"
                >
                  <span className="text-xs font-semibold leading-4 text-[#66758a]">
                    {item.label}
                  </span>
                  <strong className="mt-2 text-xl tabular-nums text-[#17365f]">{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-[#d4e0ee] bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f7f9fc] text-[#66758a]">
                  <tr>
                    <th className="px-3 py-2">{t.importPreview}</th>
                    <th className="px-3 py-2">{t.importScore}</th>
                    <th className="px-3 py-2">{t.result}</th>
                  </tr>
                </thead>
                <tbody>
                  {state.preview.map((row, index) => (
                    <tr key={`${row.identifier}-${index}`} className="border-t border-[#edf1f5]">
                      <td className="break-all px-3 py-2">{row.identifier || "—"}</td>
                      <td className="px-3 py-2">{row.scoreText || "—"}</td>
                      <td className="px-3 py-2 font-semibold">{previewStatus[row.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {state.duplicateIdentifiers.length ? (
              <p className="mt-3 break-words text-xs">
                {t.importDuplicates}: {state.duplicateIdentifiers.join(", ")}
              </p>
            ) : null}
            {tooManyRows ? (
              <p role="alert" className="mt-3 text-xs font-bold text-red-700">
                {t.importTooManyRows}
              </p>
            ) : null}
          </div>
        ) : null}

        {state.hasRows ? (
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <input
              type="checkbox"
              checked={state.confirmed}
              onChange={(event) => state.setConfirmed(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#154a9b]"
            />
            <span>
              {t.importQualificationConfirmation.replace("{score}", String(state.minimumScore))}
            </span>
          </label>
        ) : null}

        {state.result ? (
          <div className="mt-4 rounded-2xl border border-[#d9e3ee] p-4 text-sm">
            <p
              className={`font-bold ${state.result.queued > 0 ? "text-emerald-700" : "text-[#52647d]"}`}
            >
              {importResultMessage}
            </p>
            <div className="mt-3 grid gap-2 text-[#52647d] sm:grid-cols-3">
              <p>
                {t.importRequested}: {state.result.requested}
              </p>
              <p>
                {t.importImportedCount}: {state.result.queued}
              </p>
              <p>
                {t.importDuplicateCount}: {state.result.duplicateIdentifiers.length}
              </p>
              <p>
                {t.importInvalidCount}: {state.result.invalidIdentifiers.length}
              </p>
              <p>
                {t.importNotFoundCount}: {state.result.notFoundIdentifiers.length}
              </p>
              <p>
                {t.importAlreadyRecordedCount}: {state.result.alreadyRecordedIdentifiers.length}
              </p>
            </div>
            {state.result.notFoundIdentifiers.length ? (
              <p className="mt-3 break-words text-[#66758a]">
                {t.importNotFound}: {state.result.notFoundIdentifiers.join(", ")}
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
            disabled={
              !state.uniqueValidIdentifiers.length ||
              state.scoreColumnIndex === null ||
              !state.confirmed ||
              tooManyRows ||
              state.mutation.isPending
            }
            onClick={() => state.mutation.mutate()}
            className="min-h-11 rounded-xl bg-[#154a9b] px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {state.mutation.isPending ? t.pending : t.importSubmit}
          </button>
        </div>
      </Modal>
    </>
  );
}
