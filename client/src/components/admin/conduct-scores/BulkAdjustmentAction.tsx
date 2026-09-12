"use client";

import { FileSpreadsheet, ListPlus, Upload } from "lucide-react";
import type { FormEvent } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Modal } from "@/components/ui/Modal";
import { useBulkConductScoreAdjustment } from "@/hooks/conduct-score/useBulkConductScoreAdjustment";
import { conductScoreMessages } from "@/i18n/conduct-score-messages";

export function BulkAdjustmentAction({ semesterId }: { semesterId: string }) {
  const { locale } = useLanguage();
  const t = conductScoreMessages[locale];
  const state = useBulkConductScoreAdjustment(semesterId);
  const response = state.mutation.data;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state.valid) state.mutation.mutate();
  };

  return (
    <>
      <button
        type="button"
        disabled={!semesterId}
        onClick={() => state.setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#b8c9dd] bg-white px-4 text-sm font-bold text-[#154a9b] transition hover:bg-[#edf4fc] disabled:opacity-40"
      >
        <ListPlus size={17} />
        {t.bulkAdjustment}
      </button>
      <Modal
        open={state.open}
        onClose={state.close}
        title={t.bulkAdjustment}
        description={t.bulkAdjustmentDescription}
        size="lg"
      >
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-[#40546f]">
              {t.criteria}
              <CustomSelect
                className="mt-2"
                value={state.criteriaId}
                onChange={state.setCriteriaId}
                placeholder={t.criteria}
                options={(state.criteria.data?.data ?? []).map((criterion) => ({
                  value: criterion.id,
                  label: `${criterion.title} - ${criterion.defaultPoints} ${t.point.toLowerCase()}`,
                }))}
              />
            </label>
            <label className="text-sm font-semibold text-[#40546f]">
              {t.defaultPoints}
              <input
                readOnly
                value={state.selectedCriterion?.defaultPoints ?? ""}
                className="mt-2 min-h-11 w-full rounded-xl border border-[#d9e2ee] bg-[#f7f9fc] px-3 text-[#52647d]"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold text-[#40546f]">
            {t.result}
            <input
              required
              maxLength={100}
              value={state.result}
              onChange={(event) => state.setResult(event.target.value)}
              placeholder={t.resultPlaceholder}
              className="mt-2 min-h-11 w-full rounded-xl border border-[#cdd9e7] px-3 outline-none focus:border-[#154a9b]"
            />
          </label>
          <label className="block text-sm font-semibold text-[#40546f]">
            {t.reason}
            <textarea
              required
              minLength={5}
              maxLength={500}
              value={state.reason}
              onChange={(event) => state.setReason(event.target.value)}
              className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[#cdd9e7] p-3 outline-none focus:border-[#154a9b]"
            />
          </label>

          <div>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#edf2f7] p-1">
              {(["MANUAL", "EXCEL"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => state.setInputMode(mode)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                    state.inputMode === mode
                      ? "bg-white text-[#154a9b] shadow-sm"
                      : "text-[#66758a]"
                  }`}
                >
                  {mode === "MANUAL" ? t.manualInput : t.excelImport}
                </button>
              ))}
            </div>
            {state.inputMode === "MANUAL" ? (
              <label className="mt-4 block text-sm font-semibold text-[#40546f]">
                {t.studentCodes}
                <textarea
                  value={state.manualInput}
                  onChange={(event) => state.setManualInput(event.target.value)}
                  placeholder={t.studentCodesPlaceholder}
                  className="mt-2 min-h-44 w-full resize-y rounded-xl border border-[#cdd9e7] p-3 font-mono text-sm outline-none focus:border-[#154a9b]"
                />
              </label>
            ) : (
              <div className="mt-4">
                <label className="flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-[#9eb6d5] bg-[#f7faff] px-5 py-8 text-center transition hover:bg-[#edf4fc]">
                  <FileSpreadsheet size={32} className="text-[#154a9b]" />
                  <span className="mt-3 text-sm font-bold text-[#263b58]">{t.chooseExcelFile}</span>
                  <span className="mt-1 text-xs text-[#718096]">{t.excelColumnHint}</span>
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => void state.importExcel(event)}
                    className="sr-only"
                  />
                  <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#154a9b] shadow-sm">
                    <Upload size={15} /> {state.fileName || t.browseFile}
                  </span>
                </label>
                {state.fileError ? (
                  <p className="mt-2 text-sm font-semibold text-[#bd3343]">{state.fileError}</p>
                ) : null}
              </div>
            )}
            <p className="mt-3 text-sm font-semibold text-[#52647d]">
              {t.detectedStudents.replace("{count}", String(state.studentCodes.length))}
            </p>
          </div>

          {response ? (
            <div className="rounded-xl border border-[#bfd5ee] bg-[#f2f7fd] p-4 text-sm text-[#40546f]">
              <p className="font-bold text-[#154a9b]">
                {t.bulkApplied.replace("{count}", String(response.applied))}
              </p>
              {response.skippedFinalized ? (
                <p className="mt-1">
                  {t.bulkSkippedFinalized.replace("{count}", String(response.skippedFinalized))}
                </p>
              ) : null}
              {response.notFoundCodes.length ? (
                <p className="mt-1 break-words text-[#a33a48]">
                  {t.studentCodesNotFound}: {response.notFoundCodes.join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-[#e6ebf2] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={state.mutation.isPending}
              onClick={state.close}
              className="rounded-xl border border-[#cdd9e7] px-4 py-2.5 text-sm font-bold text-[#52647d]"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={!state.valid || state.mutation.isPending}
              className="rounded-xl bg-[#154a9b] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state.mutation.isPending ? t.saving : t.applyBulkAdjustment}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
