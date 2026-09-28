"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  CalendarDays,
  GraduationCap,
  QrCode,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useMyWarnings } from "@/hooks/warnings/useMyWarnings";
import { studentEventMessages } from "@/i18n/student-event-messages";

export function StudentDashboard() {
  const { locale } = useLanguage();
  const t = studentEventMessages[locale];
  const access = useAdminAccess();
  const warningQuery = useMyWarnings(access.can("conduct-score.read-own"));
  if (access.isLoading) return <PageLoadingSkeleton />;
  const profile = access.profile;
  const modules = [
    {
      href: "/events",
      label: t.events,
      description: t.dashboardEventsDescription,
      icon: CalendarDays,
      visible: access.can("event.read"),
    },
    {
      href: "/conduct-scores",
      label: t.conductScoreResults,
      description: t.dashboardScoreDescription,
      icon: Award,
      visible: access.can("conduct-score.read-own"),
    },
    {
      href: "/profile",
      label: t.studentInformation,
      description: t.dashboardProfileDescription,
      icon: UserRound,
      visible: true,
    },
    {
      href: "/qr-scan",
      label: t.qrScanner,
      description: t.qrScannerDescription,
      icon: QrCode,
      visible: true,
    },
  ].filter((item) => item.visible);

  return (
    <section className="mx-auto max-w-6xl">
      <header className="relative overflow-hidden rounded-[28px] bg-[#154a9b] px-6 py-8 text-white shadow-[0_28px_65px_-42px_rgba(21,74,155,.85)] sm:px-8 sm:py-10">
        <span className="absolute -right-12 -top-16 h-48 w-48 rounded-full border-[32px] border-white/10" />
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[.16em] text-white/70">
            <span className="h-px w-7 bg-white/60" /> {t.studentPortal}
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-[-.04em] sm:text-4xl">
            {t.dashboardGreeting}, {profile?.name ?? t.student}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">{t.dashboardDescription}</p>
        </div>
      </header>

      {(warningQuery.data?.length ?? 0) > 0 ? (
        <Link
          href="/conduct-scores"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 transition hover:border-amber-300"
        >
          <TriangleAlert className="mt-0.5 shrink-0 text-amber-700" size={20} />
          <span className="min-w-0 flex-1">
            <strong className="block">{t.conductScoreWarningTitle}</strong>
            <span className="mt-1 block text-sm leading-6 text-amber-800">
              {t.conductScoreWarningDescription
                .replace("{score}", String(warningQuery.data?.[0]?.observedScore ?? 0))
                .replace("{threshold}", String(warningQuery.data?.[0]?.threshold ?? 80))}
            </span>
          </span>
          <ArrowUpRight size={18} className="shrink-0" />
        </Link>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_.72fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map(({ href, label, description, icon: Icon }, index) => (
            <Link
              key={href}
              href={href}
              className={`group relative overflow-hidden rounded-[24px] border border-[#d9e3ee] bg-white p-5 shadow-[0_20px_48px_-42px_rgba(16,42,80,.55)] transition duration-200 hover:-translate-y-1 hover:border-[#b9cbe0] ${index === 0 && modules.length === 3 ? "sm:col-span-2" : ""}`}
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-[#154a9b] opacity-85" />
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf4fc] text-[#154a9b] transition group-hover:bg-[#154a9b] group-hover:text-white">
                  <Icon size={20} />
                </span>
                <ArrowUpRight
                  size={18}
                  className="text-[#8a9db3] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#154a9b]"
                />
              </div>
              <h2 className="mt-6 text-lg font-bold tracking-[-.02em] text-[#102a50]">{label}</h2>
              <p className="mt-2 text-sm leading-6 text-[#66758a]">{description}</p>
            </Link>
          ))}
        </div>

        <aside className="rounded-[24px] border border-[#d9e3ee] bg-white p-6 shadow-[0_20px_48px_-42px_rgba(16,42,80,.55)]">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf4fc] text-[#154a9b]">
              <GraduationCap size={21} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.12em] text-[#718096]">
                {t.dashboardAcademicInfo}
              </p>
              <p className="mt-1 font-bold text-[#102a50]">
                {profile?.student?.studentCode ?? t.dashboardNotUpdated}
              </p>
            </div>
          </div>
          <dl className="mt-6 divide-y divide-[#e7edf4] border-y border-[#e7edf4]">
            <DashboardInfo
              label={t.faculty}
              value={profile?.effectiveFaculty?.name}
              fallback={t.dashboardNotUpdated}
            />
            <DashboardInfo
              label={t.major}
              value={profile?.student?.class?.major.name}
              fallback={t.dashboardNotUpdated}
            />
            <DashboardInfo
              label={t.class}
              value={profile?.student?.class?.name}
              fallback={t.dashboardNotUpdated}
            />
          </dl>
          <Link
            href="/profile"
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#c8d5e5] text-sm font-bold text-[#154a9b] transition hover:border-[#9fb6d2] hover:bg-[#f5f8fc] active:scale-[.98]"
          >
            {t.editProfile}
          </Link>
        </aside>
      </div>
    </section>
  );
}

function DashboardInfo({
  label,
  value,
  fallback,
}: {
  label: string;
  value?: string | null;
  fallback: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <dt className="text-sm font-medium text-[#718096]">{label}</dt>
      <dd className="text-right text-sm font-bold text-[#314966]">{value || fallback}</dd>
    </div>
  );
}
