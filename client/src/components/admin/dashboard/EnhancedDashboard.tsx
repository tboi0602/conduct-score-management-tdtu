"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  Award,
  CalendarDays,
  CircleAlert,
  KeyRound,
  Percent,
  School,
  UserRoundCog,
  Users,
} from "lucide-react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { rankingLabel } from "@/components/conduct-scores/ConductScoreReport";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Modal } from "@/components/ui/Modal";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import type { Permission } from "@/types/admin";
import type { ConductScoreRanking } from "@/types/conduct-score";

const DashboardCharts = dynamic(
  () => import("./DashboardCharts").then((module) => module.DashboardCharts),
  {
    ssr: false,
    loading: () => <div className="mt-5 h-72 animate-pulse rounded-[22px] bg-[#eaf0f7]" />,
  },
);

export function EnhancedDashboard() {
  const { locale } = useLanguage();
  const vi = locale === "vi";
  const access = useAdminAccess();
  const state = useDashboardData(access.can("dashboard.read"));
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of access.profile?.permissions ?? []) {
      const group = permission.permission === "*" ? "system" : permission.permission.split(".")[0];
      groups.set(group, [...(groups.get(group) ?? []), permission]);
    }
    return [...groups.entries()];
  }, [access.profile?.permissions]);
  if (access.isLoading || state.dashboard.isPending) return <PageLoadingSkeleton />;
  const data = state.dashboard.data;
  if (!data)
    return (
      <p className="rounded-2xl bg-red-50 p-4 text-red-700">
        {vi ? "Không thể tải Dashboard." : "Unable to load the Dashboard."}
      </p>
    );
  const cards = [
    { label: vi ? "Sinh viên" : "Students", value: data.totals.students, icon: Users },
    {
      label: data.scope === "GLOBAL" ? (vi ? "Khoa" : "Faculties") : vi ? "Lớp" : "Classes",
      value: data.scope === "GLOBAL" ? data.totals.faculties : data.totals.classes,
      icon: School,
    },
    { label: vi ? "Sự kiện" : "Events", value: data.totals.events.total, icon: CalendarDays },
    {
      label: vi ? "Tỷ lệ tham gia" : "Attendance rate",
      value: `${data.totals.attendanceRate}%`,
      icon: Percent,
    },
    {
      label: vi ? "Điểm trung bình" : "Average score",
      value: data.totals.averageScore,
      icon: Award,
    },
    {
      label: vi ? "Sinh viên dưới 50" : "Students below 50",
      value: data.totals.atRisk,
      icon: CircleAlert,
    },
    {
      label: vi ? "Bảng điểm đã chốt" : "Finalized scores",
      value: data.totals.finalScores,
      icon: Award,
    },
    { label: vi ? "Nhân sự" : "Staff", value: data.totals.staff, icon: UserRoundCog },
  ];
  const chartLabels = {
    trend: vi ? "Đăng ký và tham gia trong 12 tuần" : "Registrations and attendance over 12 weeks",
    lifecycle: vi ? "Trạng thái sự kiện" : "Event lifecycle",
    attendance: vi ? "Kết quả tham gia" : "Attendance outcomes",
    rankings: vi ? "Phân bố xếp loại" : "Ranking distribution",
    comparison:
      data.scope === "GLOBAL"
        ? vi
          ? "Điểm trung bình theo khoa"
          : "Average score by faculty"
        : vi
          ? "Điểm trung bình theo lớp"
          : "Average score by class",
    registrations: vi ? "Đăng ký" : "Registrations",
    attended: vi ? "Tham gia" : "Attended",
    upcoming: vi ? "Sắp diễn ra" : "Upcoming",
    ongoing: vi ? "Đang diễn ra" : "Ongoing",
    completed: vi ? "Đã hoàn thành" : "Completed",
  };
  return (
    <section>
      <header className="flex flex-col gap-5 border-b border-[#dfe7f0] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-px w-7 bg-[#154a9b]" />
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#154a9b]">
              {data.scope === "GLOBAL"
                ? "TDTU Intelligence"
                : access.profile?.effectiveFaculty?.name}
            </p>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-[-.035em] text-[#102a50] sm:text-4xl">
            {vi ? "Tổng quan vận hành" : "Operations overview"}
          </h1>
          <p className="mt-2 text-sm text-[#66758a]">
            {vi
              ? "Theo dõi sự kiện, điểm danh và điểm rèn luyện trong cùng một góc nhìn."
              : "Monitor events, attendance, and conduct scores in one view."}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <CustomSelect
            className="w-full sm:w-52"
            value={state.semesterId}
            onChange={state.setSemesterId}
            placeholder={vi ? "Học kỳ" : "Semester"}
            options={(state.semesters.data?.data ?? []).map((item) => ({
              value: item.id,
              label: `${item.type} · ${item.year}`,
            }))}
          />
          <button
            type="button"
            onClick={() => setPermissionsOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#cbd8e7] bg-white px-4 text-sm font-bold text-[#40546f] transition hover:border-[#a9bdd4] hover:bg-[#f8faff] active:scale-[.98]"
          >
            <KeyRound size={17} />
            {access.profile?.permissions.length ?? 0} {vi ? "quyền" : "permissions"}
          </button>
        </div>
      </header>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="group relative overflow-hidden rounded-[22px] border border-[#d9e3ee] bg-white p-5 shadow-[0_18px_42px_-36px_rgba(16,42,80,.62)] transition duration-200 hover:-translate-y-1 hover:border-[#bfd0e3] hover:shadow-[0_24px_50px_-34px_rgba(16,42,80,.58)]"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-[#154a9b] opacity-80" />
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4fc] text-[#154a9b] transition group-hover:bg-[#154a9b] group-hover:text-white">
              <Icon size={19} />
            </span>
            <p className="mt-5 text-3xl font-black tracking-tight text-[#102a50]">{value}</p>
            <p className="mt-1 text-sm text-[#66758a]">{label}</p>
          </article>
        ))}
      </div>
      <DashboardCharts
        data={{
          ...data,
          rankings: data.rankings.map((item) => ({
            ...item,
            name: rankingLabel(item.name as ConductScoreRanking, locale),
          })),
        }}
        labels={chartLabels}
      />
      <article className="mt-5 overflow-hidden rounded-[24px] border border-[#d9e3ee] bg-white shadow-[0_20px_48px_-40px_rgba(16,42,80,.6)]">
        <div className="border-b border-[#e3eaf2] bg-[#fbfcfe] p-5">
          <h2 className="text-lg font-bold tracking-[-.02em] text-[#102a50]">
            {vi ? "Sự kiện nổi bật" : "Top events"}
          </h2>
        </div>
        <div className="divide-y divide-[#edf1f5]">
          {data.topEvents.map((event, index) => (
            <div
              key={event.id}
              className="grid grid-cols-[36px_1fr_auto] items-center gap-3 p-4 transition hover:bg-[#f8faff]"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#edf4fc] font-mono text-sm font-black text-[#154a9b]">
                {index + 1}
              </span>
              <div>
                <p className="font-semibold text-[#263b58]">{event.name}</p>
                <p className="text-xs text-[#718096]">
                  {event.registrations} {vi ? "đăng ký" : "registrations"}
                </p>
              </div>
              <strong className="text-sm text-[#2f855a]">
                {event.attendance} {vi ? "tham gia" : "attended"}
              </strong>
            </div>
          ))}
        </div>
      </article>
      <Modal
        open={permissionsOpen}
        onClose={() => setPermissionsOpen(false)}
        title={vi ? "Chi tiết quyền hạn" : "Permission details"}
      >
        <div className="space-y-5">
          {groupedPermissions.map(([group, permissions]) => (
            <section key={group}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#154a9b]">{group}</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {permissions.map((permission) => (
                  <div key={permission.id} className="rounded-xl border border-[#e1e8f0] p-3">
                    <p className="font-mono text-xs font-bold text-[#263b58]">
                      {permission.permission}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#66758a]">
                      {permission.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Modal>
    </section>
  );
}
