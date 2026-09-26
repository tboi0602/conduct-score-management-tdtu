"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { ConductScoreReport } from "@/components/conduct-scores/ConductScoreReport";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useMyConductScores } from "@/hooks/conduct-score/useConductScores";
import { conductScoreMessages } from "@/i18n/conduct-score-messages";

export function MyConductScores() {
  const { locale } = useLanguage();
  const t = conductScoreMessages[locale];
  const state = useMyConductScores();
  return (
    <section className="mx-auto max-w-5xl">
      <header className="flex flex-col gap-4 border-b border-[#dfe7f0] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-px w-7 bg-[#154a9b]" />
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#154a9b]">
              Conduct Score
            </p>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-[-.035em] text-[#102a50] sm:text-4xl">
            {t.myTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#60728a]">{t.mySubtitle}</p>
        </div>
        <CustomSelect
          className="w-full sm:w-56"
          value={state.semesterId}
          onChange={state.setSemesterId}
          placeholder={t.semester}
          options={(state.semesters.data?.data ?? []).map((item) => ({
            value: item.id,
            label: `${item.type} · ${item.year}`,
          }))}
        />
      </header>
      {state.score.isPending ? (
        <div className="mt-6">
          <PageLoadingSkeleton />
        </div>
      ) : null}
      {state.score.error ? (
        <p className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">{t.loadError}</p>
      ) : null}
      {state.score.data ? (
        <div className="mt-7">
          <ConductScoreReport data={state.score.data} blueHeader currentEventResultsOnly />
        </div>
      ) : null}
    </section>
  );
}
