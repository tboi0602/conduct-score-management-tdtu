"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarDays, CheckCircle2, KeyRound, Percent, Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";
import { dashboardMessages } from "@/i18n/dashboard-messages";
import { queryKeys } from "@/lib/query-keys";
import { attendanceService } from "@/services/attendance";
import type { Permission } from "@/types/admin";

export function StatisticsDashboard() {
  const { locale } = useAdminTranslations();
  const t = dashboardMessages[locale];
  const access = useAdminAccess();
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const query = useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: () => attendanceService.dashboard().then((response) => response.data),
    enabled: access.can("dashboard.read"),
    staleTime: 60_000,
  });
  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of access.profile?.permissions ?? []) {
      const group = permission.permission === "*" ? "system" : permission.permission.split(".")[0];
      groups.set(group, [...(groups.get(group) ?? []), permission]);
    }
    return [...groups.entries()];
  }, [access.profile?.permissions]);
  if (access.isLoading || (access.can("dashboard.read") && query.isPending)) {
    return <PageLoadingSkeleton />;
  }
  const data = query.data;
  const cards = data
    ? [
        { label: t.students, value: data.totals.students, icon: Users },
        { label: t.faculties, value: data.totals.faculties, icon: Building2 },
        { label: t.events, value: data.totals.events.total, icon: CalendarDays },
        { label: t.registrations, value: data.totals.registrations, icon: CheckCircle2 },
        { label: t.attendance, value: data.totals.attendanceRecords, icon: CheckCircle2 },
        { label: t.absences, value: data.totals.absences, icon: Users },
        { label: t.attendanceRate, value: `${data.totals.attendanceRate}%`, icon: Percent },
      ]
    : [];
  return (
    <section>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[.16em] text-[#154a9b]">{t.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold text-[#102a50]">
            {t.hello}, {access.profile?.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66758a]">{t.description}</p>
        </div>
        <button
          type="button"
          onClick={() => setPermissionsOpen(true)}
          className="flex items-center gap-3 self-start rounded-2xl border border-[#dce4ef] bg-white px-4 py-3 shadow-[0_12px_28px_-24px_rgba(31,67,111,.4)]"
        >
          <KeyRound size={18} className="text-[#154a9b]" />
          <span className="font-bold text-[#102a50]">
            {access.profile?.permissions.length ?? 0} {t.permissions}
          </span>
        </button>
      </div>
      {query.error ? (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{t.loadError}</p>
      ) : null}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-[22px] border border-[#dce4ef] bg-white p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4fc] text-[#154a9b]">
              <Icon size={19} />
            </span>
            <p className="mt-5 text-3xl font-bold text-[#102a50]">{value}</p>
            <p className="mt-1 text-sm text-[#66758a]">{label}</p>
          </article>
        ))}
      </div>
      {data ? (
        <div className="mt-5 rounded-[22px] border border-[#dce4ef] bg-white p-5">
          <h2 className="font-bold text-[#102a50]">{t.events}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-2xl font-bold text-blue-800">{data.totals.events.upcoming}</p>
              <p className="text-sm text-blue-700">{t.upcoming}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-2xl font-bold text-emerald-800">{data.totals.events.ongoing}</p>
              <p className="text-sm text-emerald-700">{t.ongoing}</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-2xl font-bold text-slate-800">{data.totals.events.completed}</p>
              <p className="text-sm text-slate-600">{t.completed}</p>
            </div>
          </div>
        </div>
      ) : null}
      {data?.faculties?.length ? (
        <div className="mt-5 overflow-hidden rounded-[22px] border border-[#dce4ef] bg-white">
          <div className="border-b border-[#e6ebf2] p-5">
            <h2 className="font-bold text-[#102a50]">{t.facultyStatistics}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f7f9fc] text-xs uppercase text-[#718096]">
                <tr>
                  <th className="px-5 py-3">{t.faculty}</th>
                  <th>{t.students}</th>
                  <th>{t.events}</th>
                  <th>{t.registrations}</th>
                  <th>{t.attendance}</th>
                  <th>{t.absences}</th>
                  <th>{t.attendanceRate}</th>
                </tr>
              </thead>
              <tbody>
                {data.faculties?.map((faculty) => (
                  <tr key={faculty.id} className="border-t border-[#edf1f5]">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#263b58]">{faculty.name}</p>
                      <p className="text-xs text-[#718096]">{faculty.code}</p>
                    </td>
                    <td>{faculty.students}</td>
                    <td>{faculty.events}</td>
                    <td>{faculty.registrations}</td>
                    <td>{faculty.attendanceRecords}</td>
                    <td>{faculty.absences}</td>
                    <td>{faculty.attendanceRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <Modal
        open={permissionsOpen}
        onClose={() => setPermissionsOpen(false)}
        title={t.permissionDetails}
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
