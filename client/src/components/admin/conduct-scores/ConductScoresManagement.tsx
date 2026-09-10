"use client";

import Link from "next/link";
import { Eye, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { PaginationControls } from "@/components/admin/PaginationControls";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { rankingLabel } from "@/components/conduct-scores/ConductScoreReport";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useConductScoresManagement } from "@/hooks/useConductScores";
import { conductScoreMessages } from "@/i18n/conduct-score-messages";
import type { ConductScoreRanking, ConductScoreStatus } from "@/types/conduct-score";

const rankings: ConductScoreRanking[] = ["EXCELLENT", "GOOD", "FAIR", "AVERAGE", "POOR"];

export function ConductScoresManagement() {
  const { locale } = useLanguage();
  const t = conductScoreMessages[locale];
  const access = useAdminAccess();
  const state = useConductScoresManagement();
  const [bulkMode, setBulkMode] = useState<"selected" | "filtered" | null>(null);
  if (access.isLoading) return <PageLoadingSkeleton />;
  if (!access.can("conduct-score.read"))
    return <p className="rounded-2xl bg-red-50 p-5 text-red-700">403</p>;
  const response = state.list.data;
  const canFilterAllFaculties = access.can("*");
  const selectedFacultyId = canFilterAllFaculties
    ? (state.filters.facultyId ?? "")
    : (access.profile?.effectiveFaculty?.id ?? "");
  const faculties = state.academicOptions.data?.data ?? [];
  const scopedFaculties = canFilterAllFaculties
    ? faculties
    : faculties.filter((faculty) => faculty.id === selectedFacultyId);
  const majors = scopedFaculties.find((faculty) => faculty.id === selectedFacultyId)?.majors ?? [];
  const classes = majors.find((major) => major.id === state.filters.majorId)?.classes ?? [];
  const selectableIds =
    response?.data
      .filter((item) => item.score?.status !== "FINAL")
      .map((item) => item.student.id) ?? [];
  const allPageSelected =
    selectableIds.length > 0 &&
    selectableIds.every((studentId) => state.selectedStudentIds.includes(studentId));
  const canFinalize = access.can("conduct-score.finalize");
  return (
    <section>
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#154a9b]">
            Conduct Score
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102a50]">{t.title}</h1>
          <p className="mt-2 text-sm text-[#66758a]">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canFinalize ? (
            <>
              <button
                type="button"
                disabled={!state.selectedStudentIds.length || state.bulkFinalize.isPending}
                onClick={() => setBulkMode("selected")}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#b8c9dd] bg-white px-4 text-sm font-bold text-[#154a9b] transition hover:bg-[#edf4fc] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <LockKeyhole size={16} />
                {t.finalizeSelected}
                {state.selectedStudentIds.length ? ` (${state.selectedStudentIds.length})` : ""}
              </button>
              <button
                type="button"
                disabled={
                  !response?.pagination.total ||
                  state.filters.status === "FINAL" ||
                  state.bulkFinalize.isPending
                }
                onClick={() => setBulkMode("filtered")}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#154a9b] px-4 text-sm font-bold text-white transition hover:bg-[#103f85] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <LockKeyhole size={16} />
                {t.finalizeFiltered}
              </button>
            </>
          ) : null}
          <div className="rounded-2xl border border-[#dbe5f0] bg-white px-4 py-3 text-sm font-semibold text-[#52647d]">
            {access.profile?.effectiveFaculty?.name ?? "TDTU"}
          </div>
        </div>
      </header>
      <div className="mt-7 grid gap-3 rounded-[22px] border border-[#dce4ef] bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="relative md:col-span-2">
          <span className="sr-only">{t.search}</span>
          <Search className="absolute left-3 top-3.5 text-[#8291a5]" size={17} />
          <input
            value={state.searchTerm}
            onChange={(event) => state.setSearchTerm(event.target.value)}
            placeholder={t.search}
            className="min-h-11 w-full rounded-xl border border-[#cdd9e7] pl-10 pr-3 text-sm outline-none focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10"
          />
        </label>
        <CustomSelect
          value={state.filters.semesterId}
          onChange={(semesterId) => {
            state.setPage(1);
            state.setFilters((current) => ({ ...current, semesterId }));
          }}
          placeholder={t.semester}
          options={(state.semesters.data?.data ?? []).map((semester) => ({
            value: semester.id,
            label: `${semester.type} · ${semester.year}`,
          }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <CustomSelect
            value={state.filters.status ?? ""}
            onChange={(status) => {
              state.setPage(1);
              state.setFilters((current) => ({
                ...current,
                status: (status || undefined) as ConductScoreStatus | undefined,
              }));
            }}
            placeholder={t.status}
            options={[
              { value: "DRAFT", label: t.draft },
              { value: "FINAL", label: t.final },
            ]}
          />
          <CustomSelect
            value={state.filters.ranking ?? ""}
            onChange={(ranking) => {
              state.setPage(1);
              state.setFilters((current) => ({
                ...current,
                ranking: (ranking || undefined) as ConductScoreRanking | undefined,
              }));
            }}
            placeholder={t.ranking}
            options={rankings.map((value) => ({ value, label: rankingLabel(value, locale) }))}
          />
        </div>
        {canFilterAllFaculties ? (
          <CustomSelect
            value={state.filters.facultyId ?? ""}
            onChange={(facultyId) => {
              state.setPage(1);
              state.setFilters((current) => ({
                ...current,
                facultyId: facultyId || undefined,
                majorId: undefined,
                classId: undefined,
              }));
            }}
            placeholder={t.allFaculties}
            options={faculties.map((faculty) => ({
              value: faculty.id,
              label: `${faculty.code} — ${faculty.name}`,
            }))}
          />
        ) : null}
        <CustomSelect
          value={state.filters.majorId ?? ""}
          onChange={(majorId) => {
            state.setPage(1);
            state.setFilters((current) => ({
              ...current,
              majorId: majorId || undefined,
              classId: undefined,
            }));
          }}
          placeholder={t.allMajors}
          disabled={!selectedFacultyId}
          options={majors.map((major) => ({
            value: major.id,
            label: `${major.code} — ${major.name}`,
          }))}
        />
        <CustomSelect
          value={state.filters.classId ?? ""}
          onChange={(classId) => {
            state.setPage(1);
            state.setFilters((current) => ({ ...current, classId: classId || undefined }));
          }}
          placeholder={t.allClasses}
          disabled={!state.filters.majorId}
          options={classes.map((item) => ({
            value: item.id,
            label: `${item.code} — ${item.name}`,
          }))}
        />
      </div>
      {state.list.isPending ? (
        <div className="mt-6">
          <PageLoadingSkeleton />
        </div>
      ) : null}
      {state.list.error ? (
        <p className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">{t.loadError}</p>
      ) : null}
      {response ? (
        <div className="mt-6 overflow-hidden rounded-[22px] border border-[#dce4ef] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[#f7f9fc] text-xs uppercase tracking-wide text-[#718096]">
                <tr>
                  {canFinalize ? (
                    <th className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        disabled={!selectableIds.length}
                        onChange={() => state.toggleStudents(selectableIds)}
                        aria-label={t.selectAll}
                        className="h-4 w-4 rounded border-[#b8c9dd] accent-[#154a9b]"
                      />
                    </th>
                  ) : null}
                  <th className="px-5 py-4">#</th>
                  <th>{t.student}</th>
                  <th>{t.studentCode}</th>
                  <th>{t.major}</th>
                  <th>{t.class}</th>
                  <th>{t.score}</th>
                  <th>{t.ranking}</th>
                  <th>{t.status}</th>
                  <th className="text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {response.data.map((item, index) => (
                  <tr
                    key={item.student.id}
                    className="border-t border-[#edf1f5] hover:bg-[#fbfcfe]"
                  >
                    {canFinalize ? (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={state.selectedStudentIds.includes(item.student.id)}
                          disabled={item.score?.status === "FINAL"}
                          onChange={() => state.toggleStudent(item.student.id)}
                          aria-label={`${t.selectStudent}: ${item.student.user.name}`}
                          className="h-4 w-4 rounded border-[#b8c9dd] accent-[#154a9b]"
                        />
                      </td>
                    ) : null}
                    <td className="px-5 py-4 tabular-nums text-[#718096]">
                      {(response.pagination.page - 1) * response.pagination.limit + index + 1}
                    </td>
                    <td>
                      <p className="font-bold text-[#263b58]">{item.student.user.name}</p>
                      <p className="text-xs text-[#718096]">
                        {item.student.studentCode}{item.student.user.email}
                      </p>
                    </td>
                    <td>
                      <p className="font-bold text-[#263b58]">{item.student.studentCode}</p>
                    </td>
                    <td>
                      <p className="font-bold text-[#263b58]">{item.student.major ?? "—"}</p>
                    </td>
                    <td>{item.student.class?.name ?? "—"}</td>
                    <td className="text-xl font-bold text-[#154a9b]">
                      {item.score?.totalScore ?? 0}
                    </td>
                    <td>{rankingLabel(item.score?.ranking, locale)}</td>
                    <td>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.score?.status === "FINAL" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {item.score?.status === "FINAL" ? t.final : t.draft}
                      </span>
                    </td>
                    <td className="text-center">
                      <Link
                        aria-label={t.view}
                        href={`/admin/conduct-scores/${item.student.id}?semesterId=${state.filters.semesterId}`}
                        className="inline-grid h-9 w-9 place-items-center rounded-xl text-[#154a9b] hover:bg-[#eaf2fc]"
                      >
                        <Eye size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!response.data.length ? (
            <div className="grid place-items-center p-12 text-center text-[#718096]">
              <ShieldCheck size={28} />
              <p className="mt-3">{t.noData}</p>
            </div>
          ) : null}
          <PaginationControls
            pagination={response.pagination}
            onPageChange={state.setPage}
            disabled={state.list.isFetching}
          />
        </div>
      ) : null}
      <ConfirmDialog
        open={bulkMode !== null}
        onClose={() => setBulkMode(null)}
        onConfirm={() => {
          state.bulkFinalize.mutate(
            bulkMode === "selected" ? state.selectedStudentIds : undefined,
            { onSuccess: () => setBulkMode(null) },
          );
        }}
        title={bulkMode === "selected" ? t.finalizeSelected : t.finalizeFiltered}
        subject={
          bulkMode === "selected" ? t.confirmFinalizeSelected : t.confirmFinalizeFiltered
        }
        pending={state.bulkFinalize.isPending}
      />
    </section>
  );
}
