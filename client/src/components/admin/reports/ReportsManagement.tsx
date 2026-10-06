"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { queryKeys } from "@/lib/query-keys";
import { reportMessages } from "@/i18n/report-messages";
import { reportsService } from "@/services/reports";
import type { StudentReport, StudentReportFilter } from "@/types/admin";
import { useQuery } from "@tanstack/react-query";

const ranks = ["EXCELLENT", "GOOD", "FAIR", "AVERAGE", "POOR", "UNRATED"] as const;

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function ReportsManagement() {
  const { locale } = useAdminTranslations();
  const vi = locale === "vi";
  const t = reportMessages[locale];
  const access = useAdminAccess();
  const isAdmin = access.profile?.roles.some((role) => role.name === "ADMIN");
  const [filters, setFilters] = useState<StudentReportFilter>({});
  const [page, setPage] = useState(1);
  const [printRows, setPrintRows] = useState<StudentReport["items"] | null>(null);
  const report = useQuery({
    queryKey: queryKeys.reports.students(filters, page),
    queryFn: () => reportsService.students(filters, page).then((response) => response.data),
    enabled: !access.isLoading && access.can("dashboard.read"),
    placeholderData: (previous) => previous,
  });
  const data = report.data;
  const effectiveFilters = {
    ...filters,
    semesterId: filters.semesterId ?? data?.semester.id,
  };
  const updateFilter = (field: keyof StudentReportFilter, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [field]: value || undefined }));
  };
  const getAllRows = async () => {
    if (!data) return [];
    const rows = [...data.items];
    for (let nextPage = 2; nextPage <= data.pagination.totalPages; nextPage += 1) {
      const response = await reportsService.students(effectiveFilters, nextPage);
      rows.push(...response.data.items);
    }
    return rows;
  };
  useEffect(() => {
    if (!printRows) return;
    const clearPrintRows = () => setPrintRows(null);
    window.addEventListener("afterprint", clearPrintRows);
    return () => window.removeEventListener("afterprint", clearPrintRows);
  }, [printRows]);

  const hasMultipleFaculties = Boolean(
    data?.canManageAllFaculties || (data?.options.faculties && data.options.faculties.length > 0),
  );

  const downloadCsv = async () => {
    if (!data) return;
    const rows = await getAllRows();
    const headers = [
      t.studentCode,
      t.name,
      ...(hasMultipleFaculties ? [t.faculty] : []),
      t.class,
      t.major,
      t.conductScore,
      t.rankingLabel,
    ];
    const table = [
      headers,
      ...rows.map((student) => [
        student.studentCode,
        student.name,
        ...(hasMultipleFaculties ? [student.facultyName ?? "—"] : []),
        student.classCode,
        student.majorName,
        student.totalScore === null ? "" : String(student.totalScore),
        student.ranking ? t.ranks[student.ranking] : t.ranks.UNRATED,
      ]),
    ];
    const csv = `\ufeff${table.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `conduct-report-${data.semester.year}-${data.semester.type}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const printAll = async () => {
    const rows = await getAllRows();
    setPrintRows(rows);
    window.setTimeout(() => window.print(), 100);
  };

  if (access.isLoading) return <PageLoadingSkeleton />;
  if (!access.can("dashboard.read")) {
    return (
      <p className="rounded-xl border border-[#dce4ef] bg-white p-6 text-sm">{t.accessDenied}</p>
    );
  }
  if (report.isPending) return <PageLoadingSkeleton />;

  return (
    <section className="print:bg-white">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[.16em] text-[#154a9b]">{t.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold text-[#102a50]">{t.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66758a]">{t.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => void downloadCsv()}
            disabled={!data?.items.length}
            className="inline-flex items-center gap-2 rounded-xl bg-[#154a9b] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            <Download size={17} /> {t.downloadCsv}
          </button>
          <button
            type="button"
            onClick={() => void printAll()}
            disabled={!data?.items.length}
            className="inline-flex items-center gap-2 rounded-xl border border-[#cbd8e6] bg-white px-4 py-3 text-sm font-bold text-[#263b58] disabled:opacity-50"
          >
            <Printer size={17} /> {t.print}
          </button>
        </div>
      </div>
      {report.error ? (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{t.loadError}</p>
      ) : null}
      {data ? (
        <>
          <div
            className={`mt-6 grid gap-3 sm:grid-cols-2 ${hasMultipleFaculties ? "lg:grid-cols-6" : "lg:grid-cols-5"} print:hidden`}
          >
            <CustomSelect
              value={effectiveFilters.semesterId ?? ""}
              onChange={(value) => updateFilter("semesterId", value)}
              placeholder={t.semester}
              options={data.options.semesters.map((semester) => ({
                value: semester.id,
                label: `${semester.year} · ${semester.type}`,
              }))}
            />
            {hasMultipleFaculties && data.options.faculties ? (
              <CustomSelect
                value={filters.facultyId ?? ""}
                onChange={(value) => {
                  setPage(1);
                  setFilters((current) => ({
                    ...current,
                    facultyId: value || undefined,
                    majorId: undefined,
                    classId: undefined,
                  }));
                }}
                placeholder={t.allFaculties}
                options={data.options.faculties.map((fac) => ({ value: fac.id, label: fac.name }))}
              />
            ) : null}
            <CustomSelect
              value={filters.majorId ?? ""}
              onChange={(value) => {
                setPage(1);
                setFilters((current) => ({
                  ...current,
                  majorId: value || undefined,
                  classId: undefined,
                }));
              }}
              placeholder={t.allMajors}
              options={data.options.majors.map((major) => ({ value: major.id, label: major.name }))}
            />
            <CustomSelect
              value={filters.classId ?? ""}
              onChange={(value) => updateFilter("classId", value)}
              placeholder={t.allClasses}
              options={data.options.classes.map((classItem) => ({
                value: classItem.id,
                label: classItem.code,
              }))}
            />
            <CustomSelect
              value={filters.ranking ?? ""}
              onChange={(value) => updateFilter("ranking", value)}
              placeholder={t.allRanks}
              options={ranks.map((rank) => ({ value: rank, label: t.ranks[rank] }))}
            />
            <input
              aria-label={t.search}
              value={filters.search ?? ""}
              onChange={(event) => updateFilter("search", event.target.value.trimStart())}
              placeholder={t.search}
              className="min-h-11 rounded-xl border border-[#cbd8e6] px-3 text-sm outline-none focus:border-[#154a9b]"
            />
          </div>
          <div className="mt-5 overflow-x-auto rounded-[22px] border border-[#dce4ef] bg-white">
            <div className="flex items-center gap-2 border-b border-[#e6ebf2] p-5">
              <FileText size={18} className="text-[#154a9b]" />
              <h2 className="font-bold text-[#102a50]">
                {t.studentList} · {data.semester.year} {data.semester.type}
              </h2>
              <span className="ml-auto text-sm text-[#66758a]">
                {data.pagination.total} {t.records}
              </span>
            </div>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f7f9fc] text-xs uppercase text-[#718096]">
                <tr>
                  <th className="px-5 py-3">{t.studentCode}</th>
                  <th className="px-5 py-3">{t.name}</th>
                  {hasMultipleFaculties ? <th className="px-5 py-3">{t.faculty}</th> : null}
                  <th className="px-5 py-3">{t.class}</th>
                  <th className="px-5 py-3">{t.major}</th>
                  <th className="px-5 py-3">{t.conductScore}</th>
                  <th className="px-5 py-3">{t.rankingLabel}</th>
                </tr>
              </thead>
              <tbody>
                {(printRows ?? data.items).map((student) => (
                  <tr key={student.id} className="border-t border-[#edf1f5]">
                    <td className="px-5 py-4 font-mono">{student.studentCode}</td>
                    <td className="px-5 py-4 font-semibold text-[#263b58]">{student.name}</td>
                    {hasMultipleFaculties ? (
                      <td className="px-5 py-4 text-[#52647d]">{student.facultyName ?? "—"}</td>
                    ) : null}
                    <td className="px-5 py-4">{student.classCode}</td>
                    <td className="px-5 py-4">{student.majorName}</td>
                    <td className="px-5 py-4">{student.totalScore ?? "—"}</td>
                    <td className="px-5 py-4">
                      {student.ranking ? t.ranks[student.ranking] : t.ranks.UNRATED}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(printRows ?? data.items).length === 0 ? (
              <p className="p-8 text-center text-sm text-[#66758a]">{t.noData}</p>
            ) : null}
            {!printRows ? (
              <div className="print:hidden">
                <PaginationControls
                  pagination={data.pagination}
                  onPageChange={setPage}
                  disabled={report.isFetching}
                />
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
