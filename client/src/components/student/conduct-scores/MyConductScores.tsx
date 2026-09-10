"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { ConductScoreReport } from "@/components/conduct-scores/ConductScoreReport";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useMyConductScore } from "@/hooks/useConductScores";
import { conductScoreMessages } from "@/i18n/conduct-score-messages";
import { queryKeys } from "@/lib/query-keys";
import { semesterService } from "@/services/events";

export function MyConductScores() {
  const { locale } = useLanguage();
  const t = conductScoreMessages[locale];
  const [semesterId, setSemesterId] = useState("");
  const semesters = useQuery({
    queryKey: queryKeys.semesters.list({}),
    queryFn: () => semesterService.list(1, 100),
    staleTime: 10 * 60_000,
  });
  useEffect(() => {
    if (!semesterId && semesters.data?.data[0]) setSemesterId(semesters.data.data[0].id);
  }, [semesterId, semesters.data]);
  const query = useMyConductScore(semesterId);
  return (
    <section className="mx-auto max-w-5xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#154a9b]">
            Conduct Score
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#102a50]">{t.myTitle}</h1>
          <p className="mt-2 text-sm text-[#66758a]">{t.mySubtitle}</p>
        </div>
        <CustomSelect
          className="w-full sm:w-56"
          value={semesterId}
          onChange={setSemesterId}
          placeholder={t.semester}
          options={(semesters.data?.data ?? []).map((item) => ({
            value: item.id,
            label: `${item.type} · ${item.year}`,
          }))}
        />
      </header>
      {query.isPending ? (
        <div className="mt-6">
          <PageLoadingSkeleton />
        </div>
      ) : null}
      {query.error ? (
        <p className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">{t.loadError}</p>
      ) : null}
      {query.data ? (
        <div className="mt-7">
          <ConductScoreReport data={query.data} />
        </div>
      ) : null}
    </section>
  );
}
