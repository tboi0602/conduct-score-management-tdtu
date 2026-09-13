"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CircleCheckBig,
  FilePenLine,
  LockKeyhole,
  MessageSquareText,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { ConductScoreReport } from "@/components/conduct-scores/ConductScoreReport";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Modal } from "@/components/ui/Modal";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useConductScoreDetail } from "@/hooks/conduct-score/useConductScores";
import { conductScoreMessages } from "@/i18n/conduct-score-messages";

export function ConductScoreDetails({
  studentId,
  semesterId,
}: {
  studentId: string;
  semesterId: string;
}) {
  const { locale } = useLanguage();
  const t = conductScoreMessages[locale];
  const { query, adjust, finalize, reopen, criteria } = useConductScoreDetail(
    studentId,
    semesterId,
  );
  const [criteriaId, setCriteriaId] = useState("");
  const [points, setPoints] = useState("");
  const [result, setResult] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [confirming, setConfirming] = useState<"finalize" | "reopen" | null>(null);
  if (query.isPending) return <PageLoadingSkeleton />;
  if (!query.data) return <p className="rounded-2xl bg-red-50 p-4 text-red-700">{t.loadError}</p>;
  const { score } = query.data;
  const isFinal = score?.status === "FINAL";
  const numericPoints = Number(points);
  const adjustmentValid =
    Boolean(criteriaId) &&
    points.trim() !== "" &&
    Number.isInteger(numericPoints) &&
    numericPoints >= -100 &&
    numericPoints <= 100 &&
    Boolean(result.trim()) &&
    Boolean(adjustmentReason.trim());
  const closeAdjustment = () => {
    if (adjust.isPending) return;
    setAdjustmentOpen(false);
    setCriteriaId("");
    setPoints("");
    setResult("");
    setAdjustmentReason("");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!adjustmentValid) return;
    adjust.mutate(
      {
        criteriaId,
        points: numericPoints,
        reason: adjustmentReason.trim(),
        result: result.trim(),
      },
      {
        onSuccess: () => {
          setCriteriaId("");
          setPoints("");
          setResult("");
          setAdjustmentReason("");
          setAdjustmentOpen(false);
        },
      },
    );
  };
  return (
    <section>
      <Link
        href="/admin/conduct-scores"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#154a9b]"
      >
        <ArrowLeft size={16} />
        {t.back}
      </Link>
      <article className="mt-5 overflow-hidden rounded-[24px] border border-[#d7e1ed] bg-white shadow-[0_20px_48px_-38px_rgba(16,42,80,.55)]">
        <div className={`h-1 ${isFinal ? "bg-[#16856d]" : "bg-[#154a9b]"}`} />
        <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                isFinal ? "bg-[#e8f5f1] text-[#12705c]" : "bg-[#eaf2fc] text-[#154a9b]"
              }`}
            >
              {isFinal ? (
                <CircleCheckBig size={23} strokeWidth={2.1} />
              ) : (
                <FilePenLine size={23} strokeWidth={2.1} />
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#718096]">
                {t.status}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-[-0.02em] text-[#102a50]">
                  {isFinal ? t.final : t.provisional}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                    isFinal ? "bg-[#e8f5f1] text-[#12705c]" : "bg-[#eaf2fc] text-[#154a9b]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isFinal ? "bg-[#16856d]" : "bg-[#2c6bb7]"
                    }`}
                  />
                  {isFinal ? t.final : t.draft}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66758a]">
                {isFinal ? t.finalStatusDescription : t.draftStatusDescription}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row md:justify-end">
            {!isFinal ? (
              <button
                type="button"
                onClick={() => setAdjustmentOpen(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#154a9b] px-4 text-sm font-bold text-white shadow-[0_12px_26px_-15px_rgba(21,74,155,.75)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#103f85] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#154a9b]/15 active:translate-y-0 active:scale-[.98]"
              >
                <Plus size={17} />
                {t.adjustment}
              </button>
            ) : null}
            {score ? (
              <button
                type="button"
                disabled={isFinal && reopenReason.trim().length < 5}
                onClick={() => setConfirming(isFinal ? "reopen" : "finalize")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#b8c9dd] bg-white px-4 text-sm font-bold text-[#154a9b] transition duration-200 hover:-translate-y-0.5 hover:border-[#91acd0] hover:bg-[#f5f8fc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#154a9b]/10 active:translate-y-0 active:scale-[.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40"
              >
                {isFinal ? <RotateCcw size={16} /> : <LockKeyhole size={16} />}
                {isFinal ? t.reopen : t.finalize}
              </button>
            ) : null}
          </div>
        </div>

        {isFinal ? (
          <div className="border-t border-[#e5ebf3] bg-[#f8fafc] px-5 py-5 sm:px-6">
            <label className="block max-w-3xl text-sm font-semibold text-[#314966]">
              <span className="flex items-center gap-2">
                <MessageSquareText size={17} className="text-[#154a9b]" />
                {t.reopenReason}
              </span>
              <textarea
                value={reopenReason}
                onChange={(event) => setReopenReason(event.target.value)}
                minLength={5}
                maxLength={500}
                placeholder={t.reopenReasonPlaceholder}
                className="mt-3 min-h-24 w-full resize-y rounded-xl border border-[#c8d5e5] bg-white p-3.5 text-sm leading-6 text-[#263b58] outline-none transition placeholder:text-[#9aa8ba] focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10"
              />
              <span className="mt-2 block text-xs font-medium text-[#718096]">
                {t.reopenReasonHint}
              </span>
            </label>
          </div>
        ) : null}
      </article>
      <div className="mt-5">
        <ConductScoreReport data={query.data} />
      </div>

      <Modal
        open={adjustmentOpen}
        onClose={closeAdjustment}
        title={t.adjustment}
        description={t.adjustmentDescription}
        size="md"
      >
        <form onSubmit={submit} className="space-y-5">
          <label className="block text-sm font-semibold text-[#40546f]">
            {t.criteria}
            <CustomSelect
              className="mt-2"
              value={criteriaId}
              onChange={(value) => {
                setCriteriaId(value);
                const criterion = criteria.data?.data.find((item) => item.id === value);
                setPoints(criterion ? String(criterion.defaultPoints) : "");
              }}
              placeholder={t.criteria}
              options={(criteria.data?.data ?? []).map((item) => ({
                value: item.id,
                label: item.title,
              }))}
            />
          </label>
          <label className="block text-sm font-semibold text-[#40546f]">
            {t.result}
            <input
              required
              maxLength={100}
              value={result}
              onChange={(event) => setResult(event.target.value)}
              placeholder={t.resultPlaceholder}
              className="mt-2 min-h-11 w-full rounded-xl border border-[#cdd9e7] px-3 outline-none focus:border-[#154a9b]"
            />
          </label>
          <label className="block text-sm font-semibold text-[#40546f]">
            {t.points}
            <input
              required
              type="number"
              min={-100}
              max={100}
              step={1}
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-[#cdd9e7] px-3 outline-none focus:border-[#154a9b]"
            />
          </label>
          <label className="block text-sm font-semibold text-[#40546f]">
            {t.reason}
            <textarea
              required
              maxLength={500}
              value={adjustmentReason}
              onChange={(event) => setAdjustmentReason(event.target.value)}
              className="mt-2 min-h-28 w-full resize-y rounded-xl border border-[#cdd9e7] p-3 outline-none focus:border-[#154a9b]"
            />
          </label>
          <div className="flex flex-col-reverse gap-3 border-t border-[#e6ebf2] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={adjust.isPending}
              onClick={closeAdjustment}
              className="rounded-xl border border-[#cdd9e7] px-4 py-2.5 text-sm font-bold text-[#52647d] transition hover:bg-[#f5f7fb] disabled:opacity-50"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={adjust.isPending || !adjustmentValid}
              className="rounded-xl bg-[#154a9b] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#103f85] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adjust.isPending ? t.saving : t.save}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming === "finalize")
            finalize.mutate(undefined, { onSuccess: () => setConfirming(null) });
          else
            reopen.mutate(reopenReason.trim(), {
              onSuccess: () => {
                setConfirming(null);
                setReopenReason("");
              },
            });
        }}
        title={confirming === "finalize" ? t.finalize : t.reopen}
        subject={confirming === "finalize" ? t.confirmFinalize : t.confirmReopen}
        pending={finalize.isPending || reopen.isPending}
      />
    </section>
  );
}
