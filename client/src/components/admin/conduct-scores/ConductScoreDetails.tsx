"use client";

import Link from "next/link";
import { ArrowLeft, LockKeyhole, Plus, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { ConductScoreReport } from "@/components/conduct-scores/ConductScoreReport";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Modal } from "@/components/ui/Modal";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useConductScoreDetail } from "@/hooks/useConductScores";
import { conductScoreMessages } from "@/i18n/conduct-score-messages";
import { queryKeys } from "@/lib/query-keys";
import { eventService } from "@/services/events";

export function ConductScoreDetails({
  studentId,
  semesterId,
}: {
  studentId: string;
  semesterId: string;
}) {
  const { locale } = useLanguage();
  const t = conductScoreMessages[locale];
  const { query, adjust, finalize, reopen } = useConductScoreDetail(studentId, semesterId);
  const [criteriaId, setCriteriaId] = useState("");
  const [points, setPoints] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [confirming, setConfirming] = useState<"finalize" | "reopen" | null>(null);
  const criteria = useQuery({
    queryKey: queryKeys.eventOptions.criteriaPage(1),
    queryFn: () => eventService.criteria(1),
    staleTime: 10 * 60_000,
  });
  if (query.isPending) return <PageLoadingSkeleton />;
  if (!query.data) return <p className="rounded-2xl bg-red-50 p-4 text-red-700">{t.loadError}</p>;
  const { score } = query.data;
  const numericPoints = Number(points);
  const adjustmentValid =
    Boolean(criteriaId) &&
    points.trim() !== "" &&
    Number.isInteger(numericPoints) &&
    numericPoints !== 0 &&
    numericPoints >= -100 &&
    numericPoints <= 100 &&
    Boolean(adjustmentReason.trim());
  const closeAdjustment = () => {
    if (adjust.isPending) return;
    setAdjustmentOpen(false);
    setCriteriaId("");
    setPoints("");
    setAdjustmentReason("");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!adjustmentValid) return;
    adjust.mutate(
      { criteriaId, points: numericPoints, reason: adjustmentReason.trim() },
      {
        onSuccess: () => {
          setCriteriaId("");
          setPoints("");
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
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {score?.status !== "FINAL" ? (
            <button
              type="button"
              onClick={() => setAdjustmentOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#154a9b] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#103f85] active:scale-[.98]"
            >
              <Plus size={17} />
              {t.adjustment}
            </button>
          ) : null}
          <article className="rounded-[22px] border border-[#dce4ef] bg-white p-5">
            <h2 className="font-bold text-[#102a50]">{t.status}</h2>
            <p className="mt-2 text-sm leading-6 text-[#66758a]">
              {score?.status === "FINAL" ? t.final : t.provisional}
            </p>
            {score?.status === "FINAL" ? (
              <label className="mt-4 block text-sm font-semibold text-[#40546f]">
                {t.reopenReason}
                <textarea
                  value={reopenReason}
                  onChange={(event) => setReopenReason(event.target.value)}
                  maxLength={500}
                  className="mt-2 min-h-20 w-full rounded-xl border border-[#cdd9e7] p-3 outline-none focus:border-[#154a9b]"
                />
              </label>
            ) : null}
            {score ? (
              <button
                type="button"
                disabled={score.status === "FINAL" && reopenReason.trim().length < 5}
                onClick={() => setConfirming(score.status === "FINAL" ? "reopen" : "finalize")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#b8c9dd] px-4 py-2.5 text-sm font-bold text-[#154a9b] disabled:opacity-40"
              >
                {score.status === "FINAL" ? <RotateCcw size={16} /> : <LockKeyhole size={16} />}
                {score.status === "FINAL" ? t.reopen : t.finalize}
              </button>
            ) : null}
          </article>
        </div>
      </div>
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
              onChange={setCriteriaId}
              placeholder={t.criteria}
              options={(criteria.data?.data ?? []).map((item) => ({
                value: item.id,
                label: item.title,
              }))}
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
