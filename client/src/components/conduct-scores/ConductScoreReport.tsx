"use client";

import { Award, CalendarDays, GraduationCap } from "lucide-react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { conductScoreMessages } from "@/i18n/conduct-score-messages";
import type {
  ConductScoreDetail,
  ConductScoreEntrySource,
  ConductScoreRanking,
} from "@/types/conduct-score";

type ReportProps = {
  data: ConductScoreDetail;
  compactHeader?: boolean;
  blueHeader?: boolean;
  currentEventResultsOnly?: boolean;
};

type ScoreEntry = NonNullable<ConductScoreDetail["score"]>["entries"][number];

function currentEntries(entries: ScoreEntry[]): ScoreEntry[] {
  const nonEventEntries = entries.filter((entry) => !entry.event);
  const eventEntries = new Map<string, ScoreEntry>();

  for (const entry of entries) {
    if (!entry.event) continue;
    const current = eventEntries.get(entry.event.id);
    if (!current) {
      eventEntries.set(entry.event.id, { ...entry });
      continue;
    }
    current.points += entry.points;
  }

  const activeEventEntries = [...eventEntries.values()]
    .filter((entry) => entry.points > 0)
    .map((entry) => ({ ...entry, result: "ATTENDED", source: "EVENT" as const }));

  return [...nonEventEntries, ...activeEventEntries].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() ||
      right.id.localeCompare(left.id),
  );
}

const roman = (index: number) => {
  const values = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return values[index] ?? String(index + 1);
};

export function rankingLabel(ranking: ConductScoreRanking | undefined, locale: "vi" | "en") {
  return conductScoreMessages[locale].rankings[ranking ?? "POOR"];
}

export function ConductScoreReport({
  data,
  compactHeader = false,
  blueHeader = false,
  currentEventResultsOnly = false,
}: ReportProps) {
  const { locale } = useLanguage();
  const t = conductScoreMessages[locale];
  const { student, score, criteriaCatalog } = data;
  const totalByCriteria = new Map(
    score?.criteriaTotals.map((item) => [item.criteria.id, item.cappedScore]) ?? [],
  );
  const resultLabel = (result: string, source: ConductScoreEntrySource, hasDeduction: boolean) => {
    if (source === "DEFAULT_CRITERION") {
      return hasDeduction ? t.defaultScore : t.noViolation;
    }
    if (result === "ATTENDED") return t.achieved;
    if (result === "NO_VIOLATION") return t.noViolation;
    if (result === "DEFAULT_SCORE") return t.defaultScore;
    if (result === "REVERSED") return t.reversed;
    if (result === "IMPORTED") return t.imported;
    if (result !== "RECORDED" && result !== "ADJUSTED") return result;
    if (source === "EVENT") return t.achieved;
    if (source === "REVERSAL") return t.reversed;
    if (source === "LEGACY_IMPORT") return t.imported;
    return t.adjusted;
  };

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#d8e2ef] bg-white shadow-[0_18px_45px_-38px_rgba(21,74,155,.5)]">
      <header
        className={`grid gap-5 border-b ${blueHeader ? "border-[#103f85] bg-[#154a9b] text-white" : "border-[#dce6f2] bg-[radial-gradient(circle_at_top_right,rgba(21,74,155,.12),transparent_42%)]"} ${compactHeader ? "p-5 md:grid-cols-[1fr_auto]" : "p-6 md:grid-cols-[1fr_auto] md:p-7"}`}
      >
        <div className="min-w-0">
          <div
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] ${blueHeader ? "text-white/80" : "text-[#154a9b]"}`}
          >
            <GraduationCap size={17} />
            {t.myTitle}
          </div>
          <h1
            className={`mt-2 text-balance text-2xl font-bold tracking-[-.02em] md:text-3xl ${blueHeader ? "text-white" : "text-[#102a50]"}`}
          >
            {student.user.name}
          </h1>
          <p className={`mt-2 text-sm ${blueHeader ? "text-white/90" : "text-[#60728a]"}`}>
            <span
              className={`font-mono font-semibold ${blueHeader ? "text-white" : "text-[#25466f]"}`}
            >
              {student.studentCode}
            </span>
            <span className={`mx-2 ${blueHeader ? "text-white/50" : "text-[#b6c3d2]"}`}>•</span>
            {student.class?.name ?? "—"}
          </p>
          {score?.semester ? (
            <p
              className={`mt-2 flex items-center gap-2 text-xs font-medium ${blueHeader ? "text-white/80" : "text-[#718096]"}`}
            >
              <CalendarDays size={14} />
              {score.semester.type} · {score.semester.year}
            </p>
          ) : null}
        </div>
        <div
          className={`flex min-w-48 items-center gap-4 rounded-[18px] border px-5 py-4 ${blueHeader ? "border-white/30 bg-white/10" : "border-[#cddced] bg-white/90"}`}
        >
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${blueHeader ? "bg-white/15 text-white" : "bg-[#eaf2fc] text-[#154a9b]"}`}
          >
            <Award size={22} />
          </span>
          <div>
            <p
              className={`font-mono text-3xl font-black tabular-nums ${blueHeader ? "text-white" : "text-[#102a50]"}`}
            >
              {score?.totalScore ?? 0}
              <span
                className={`text-sm font-semibold ${blueHeader ? "text-white/80" : "text-[#718096]"}`}
              >
                /100
              </span>
            </p>
            <p
              className={`mt-0.5 text-sm font-bold ${blueHeader ? "text-white" : "text-[#154a9b]"}`}
            >
              {rankingLabel(score?.ranking, locale)}
            </p>
            <p
              className={`mt-1 text-xs font-semibold ${blueHeader ? "text-white/80" : "text-[#718096]"}`}
            >
              {score?.status === "FINAL" ? t.final : t.draft}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-7 p-4 pb-7 md:p-7 md:pb-9">
        {criteriaCatalog.map((criteria, criteriaIndex) => {
          const rawEntries =
            score?.entries.filter((entry) => entry.criteria?.id === criteria.id) ?? [];
          const entries = currentEventResultsOnly ? currentEntries(rawEntries) : rawEntries;
          const hasDeduction = entries.some(
            (entry) => entry.source !== "DEFAULT_CRITERION" && entry.points < 0,
          );
          return (
            <section key={criteria.id} aria-labelledby={`criterion-${criteria.id}`}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2
                  id={`criterion-${criteria.id}`}
                  className="text-pretty text-base font-bold leading-6 text-[#087da5] md:text-lg"
                >
                  {roman(criteriaIndex)}. {criteria.title}{" "}
                  <span className="whitespace-nowrap text-sm font-bold text-[#e55345]">
                    ({t.maximum} {criteria.maxPoints} {t.points.toLowerCase()})
                  </span>
                </h2>
                <span className="font-mono text-sm font-bold tabular-nums text-[#154a9b]">
                  {totalByCriteria.get(criteria.id) ?? 0}/{criteria.maxPoints}
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[#cfdaea]">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead className="bg-[#dbeafe] text-[#173457]">
                    <tr>
                      <th className="w-20 border-r border-white/80 px-4 py-3 text-center">
                        {t.ordinal}
                      </th>
                      <th className="border-r border-white/80 px-4 py-3 text-center">
                        {t.activity}
                      </th>
                      <th className="w-40 border-r border-white/80 px-4 py-3 text-center">
                        {t.result}
                      </th>
                      <th className="w-24 px-4 py-3 text-center">{t.point}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e3e9f1]">
                    {entries.map((entry, index) => (
                      <tr key={entry.id} className="transition-colors hover:bg-[#f7faff]">
                        <td className="border-r border-[#e3e9f1] px-4 py-3 text-center font-mono tabular-nums">
                          {index + 1}
                        </td>
                        <td className="border-r border-[#e3e9f1] px-4 py-3 text-[#263b58]">
                          <p className="font-medium">
                            {entry.event?.name ?? entry.reason ?? entry.source}
                          </p>
                          <p className="mt-1 text-xs text-[#718096]">
                            {new Date(entry.createdAt).toLocaleString(locale)}
                            {entry.event && entry.reason ? ` · ${entry.reason}` : ""}
                          </p>
                        </td>
                        <td className="border-r border-[#e3e9f1] px-4 py-3 text-center text-[#40546f]">
                          {resultLabel(entry.result, entry.source, hasDeduction)}
                        </td>
                        <td
                          className={`px-4 py-3 text-center font-mono font-bold tabular-nums ${entry.points < 0 ? "text-[#c53a4b]" : "text-[#154a9b]"}`}
                        >
                          {entry.points > 0 ? "+" : ""}
                          {entry.points}
                        </td>
                      </tr>
                    ))}
                    {!entries.length ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-5 text-center text-sm text-[#718096]">
                          {t.noActivities}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}
