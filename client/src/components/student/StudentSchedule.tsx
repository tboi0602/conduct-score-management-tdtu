"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useStudentSchedule } from "@/hooks/schedules/useStudentSchedule";
import { scheduleMessages } from "@/i18n/schedule-messages";

const time = (value: string) => value.slice(11, 16);

export function StudentSchedule() {
  const { locale } = useLanguage();
  const t = scheduleMessages[locale];
  const state = useStudentSchedule();
  const [editorMode, setEditorMode] = useState<"default" | "week">("default");
  const data = state.schedule.data;
  const semester = data?.semester;
  if (state.semesters.isPending || (state.semesterId && state.schedule.isPending))
    return <PageLoadingSkeleton />;

  return (
    <section className="mx-auto max-w-7xl">
      <header className="flex flex-col gap-4 border-b border-[#e2e8f0] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#154a9b]">
            <CalendarDays size={17} /> TDTU Student
          </div>
          <h1 className="mt-3 text-3xl font-bold text-[#102a50]">{t.title}</h1>
          <p className="mt-2 text-sm text-[#60728a]">{t.subtitle}</p>
        </div>
        <CustomSelect
          className="w-full sm:w-60"
          value={state.semesterId}
          onChange={state.changeSemester}
          placeholder={t.semester}
          options={(state.semesters.data?.data ?? []).map((item) => ({
            value: item.id,
            label: `${item.type} · ${item.year}`,
          }))}
        />
      </header>

      {state.schedule.error ? (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{t.loadError}</p>
      ) : null}
      {data ? (
        <ScheduleCard title={t.editorTitle} hint={t.editorHint}>
          <div className="mb-5 grid max-w-xl grid-cols-2 gap-2 rounded-xl bg-[#eef3f8] p-1.5">
            {(["default", "week"] as const).map((mode) => {
              const active = editorMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setEditorMode(mode)}
                  className={`min-h-10 rounded-lg px-3 text-sm font-bold transition ${active ? "bg-[#154a9b] text-white shadow-sm" : "text-[#52647d] hover:bg-white"}`}
                >
                  {mode === "default" ? t.defaultTitle : t.exceptionsTitle}
                </button>
              );
            })}
          </div>

          <p className="mb-4 text-sm text-[#66758a]">
            {editorMode === "default" ? t.defaultHint : t.exceptionsHint}
          </p>

          {editorMode === "week" ? (
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => state.changeWeek(-1)}
                className="rounded-lg border p-2"
                aria-label={t.previousWeek}
              >
                <ChevronLeft />
              </button>
              <strong className="text-sm text-[#263b58]">
                {state.weekStart} – {state.days[6]}
              </strong>
              <button
                type="button"
                onClick={() => state.changeWeek(1)}
                className="rounded-lg border p-2"
                aria-label={t.nextWeek}
              >
                <ChevronRight />
              </button>
            </div>
          ) : null}

          {editorMode === "week" && state.week.isPending ? <PageLoadingSkeleton /> : null}
          {editorMode === "default" ? (
            <ScheduleGrid
              sessions={data.sessions}
              days={t.days.map((label, index) => ({ label, dayOfWeek: index + 2 }))}
              cell={(day, sessionId) => {
                const active = state.selected.has(`${day.dayOfWeek}:${sessionId}`);
                return (
                  <button
                    type="button"
                    onClick={() => state.toggleDefault(day.dayOfWeek, sessionId)}
                    className={`min-h-14 w-full rounded-lg border px-2 text-xs font-bold transition ${active ? "border-[#154a9b] bg-[#eaf2fc] text-[#154a9b]" : "border-[#e1e8f0] bg-white text-[#718096] hover:border-[#a9bdd4]"}`}
                  >
                    {active ? t.hasClass : t.empty}
                  </button>
                );
              }}
            />
          ) : state.week.data ? (
            <ScheduleGrid
              sessions={state.week.data.sessions}
              days={state.days.map((date, index) => ({
                label: `${t.days[index]} ${date.slice(8, 10)}/${date.slice(5, 7)}`,
                dayOfWeek: index + 2,
                date,
              }))}
              cell={(day, sessionId) => {
                const key = `${day.date}:${sessionId}`;
                const exception = state.exceptions.get(key);
                const hasDefault = state.selected.has(`${day.dayOfWeek}:${sessionId}`);
                const disabled =
                  state.defaultDirty ||
                  !day.date ||
                  day.date < (state.week.data?.today ?? "") ||
                  day.date < semester!.startDate.slice(0, 10) ||
                  day.date > semester!.endDate.slice(0, 10);
                const label =
                  exception?.status === "HAS_CLASS"
                    ? t.makeup
                    : exception?.status === "NO_CLASS"
                      ? t.off
                      : hasDefault
                        ? t.hasClass
                        : t.empty;
                const tone =
                  exception?.status === "HAS_CLASS"
                    ? "border-amber-500 bg-amber-50 text-amber-800"
                    : exception?.status === "NO_CLASS"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : hasDefault
                        ? "border-[#154a9b] bg-[#eaf2fc] text-[#154a9b]"
                        : "border-[#e1e8f0] bg-white text-[#718096]";
                return (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => state.toggleException(day.date!, day.dayOfWeek, sessionId)}
                    className={`min-h-14 w-full rounded-lg border px-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${tone}`}
                  >
                    {label}
                  </button>
                );
              }}
            />
          ) : null}

          {editorMode === "default" ? (
            <ActionButton
              label={state.saveDefault.isPending ? t.saving : t.saveDefault}
              disabled={!state.defaultDirty || state.saveDefault.isPending}
              onClick={() => state.saveDefault.mutate()}
            />
          ) : (
            <>
              {state.defaultDirty ? (
                <p className="mt-3 text-sm text-amber-700">{t.updateDefaultFirst}</p>
              ) : null}
              <ActionButton
                label={state.saveWeek.isPending ? t.saving : t.saveWeek}
                disabled={!state.weekDirty || state.defaultDirty || state.saveWeek.isPending}
                onClick={() => state.saveWeek.mutate()}
              />
              {state.saveWeek.error ? (
                <p className="mt-3 text-sm text-red-700">{t.saveError}</p>
              ) : null}
            </>
          )}
          {editorMode === "default" && state.saveDefault.error ? (
            <p className="mt-3 text-sm text-red-700">{t.saveError}</p>
          ) : null}
        </ScheduleCard>
      ) : null}
      <ConfirmDialog
        open={Boolean(state.pendingNavigation)}
        onClose={state.cancelNavigation}
        onConfirm={state.confirmNavigation}
        title={t.discardTitle}
        description={t.discardDescription}
        confirmLabel={t.discard}
        cancelLabel={t.cancel}
      />
    </section>
  );
}

function ScheduleCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mt-6 rounded-2xl border border-[#d9e3ee] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-[#102a50]">{title}</h2>
      <p className="mt-1 text-sm text-[#66758a]">{hint}</p>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function ScheduleGrid({
  sessions,
  days,
  cell,
}: {
  sessions: Array<{ id: string; name: string; startTime: string; endTime: string }>;
  days: Array<{ label: string; dayOfWeek: number; date?: string }>;
  cell: (
    day: { label: string; dayOfWeek: number; date?: string },
    sessionId: string,
  ) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-separate border-spacing-2">
        <thead>
          <tr>
            <th className="w-32 text-left text-xs text-[#66758a]">{sessions.length} ca</th>
            {days.map((day) => (
              <th key={day.label} className="text-center text-xs font-bold text-[#40546f]">
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id}>
              <th className="text-left">
                <span className="block text-sm font-bold text-[#102a50]">{session.name}</span>
                <span className="text-xs font-normal text-[#718096]">
                  {time(session.startTime)}–{time(session.endTime)}
                </span>
              </th>
              {days.map((day) => (
                <td key={day.label}>{cell(day, session.id)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#154a9b] px-5 text-sm font-bold text-white transition hover:bg-[#103f85] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Save size={17} />
      {label}
    </button>
  );
}
