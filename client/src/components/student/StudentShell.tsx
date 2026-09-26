"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarDays,
  CalendarRange,
  LogOut,
  QrCode,
  UserRound,
  Award,
  MessageSquareWarning,
} from "lucide-react";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { studentEventMessages } from "@/i18n/student-event-messages";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useWorkspaceSwitch } from "@/hooks/auth/useWorkspaceSwitch";
import { StudentNotifications } from "@/components/student/StudentNotifications";
import { AttendanceFailureWatcher } from "@/components/student/AttendanceFailureWatcher";

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAdminAccess();
  const { locale } = useLanguage();
  const t = studentEventMessages[locale];
  const workspace = useWorkspaceSwitch(profile?.roles.map((role) => role.name) ?? []);
  const links = [
    { href: "/profile", label: t.studentInformation, icon: UserRound },
    { href: "/schedule", label: t.schedule, icon: CalendarRange },
    ...(profile?.permissions.some(
      (item) => item.permission === "*" || item.permission === "conduct-score.read-own",
    )
      ? [{ href: "/conduct-scores", label: t.conductScoreResults, icon: Award }]
      : []),
    ...(profile?.permissions.some(
      (item) => item.permission === "*" || item.permission === "event.read",
    )
      ? [{ href: "/events", label: t.events, icon: CalendarDays }]
      : []),
    { href: "/qr-scan", label: t.qrScanner, icon: QrCode },
    ...(profile?.permissions.some(
      (item) => item.permission === "*" || item.permission === "appeal.read-own",
    )
      ? [
          {
            href: "/appeals",
            label: locale === "vi" ? "Khiếu nại" : "Appeals",
            icon: MessageSquareWarning,
          },
        ]
      : []),
  ];
  return (
    <div className="min-h-[100dvh] bg-[#fcf8f9] md:grid md:grid-cols-[280px_1fr]">
      <AttendanceFailureWatcher />
      <aside className="sticky top-0 z-30 flex h-[68px] items-center bg-[#b42332] px-4 text-white shadow-lg md:h-[100dvh] md:min-h-0 md:flex-col md:items-stretch md:px-4 md:py-5">
        <div className="flex min-w-0 shrink-0 items-center gap-3 md:h-16 md:justify-between">
          <Link href="/dashboard" aria-label={t.brand} className="rounded-lg bg-white p-1">
            <Image
              src="/images/logo.png"
              alt="TDTU"
              width={612}
              height={338}
              priority
              className="h-auto w-24 object-contain"
            />
          </Link>
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-flow-col auto-cols-fr border-t border-[#eadde0] bg-white px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-lg md:static md:mt-[60px] md:flex md:min-h-0 md:flex-1 md:flex-col md:justify-start md:gap-4 md:overflow-y-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition duration-200 md:min-h-11 md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 md:text-sm ${pathname === href ? "bg-[#fae7ea] text-[#b42332] md:bg-white md:shadow-sm" : "text-[#765f66] hover:bg-[#fff1f3] hover:text-[#b42332] md:text-white/80 md:hover:bg-white/15 md:hover:text-white"}`}
            >
              <Icon size={19} strokeWidth={pathname === href ? 2.3 : 2} />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 md:ml-0 md:mt-auto md:block md:border-t md:border-white/20 md:pt-4">
          <StudentNotifications />
          <div className="md:hidden">
            <LanguageSwitcher compact />
          </div>
          <Link
            href="/profile"
            aria-label={t.profile}
            className="grid h-10 w-10 place-items-center rounded-xl transition hover:bg-white/15 md:flex md:h-auto md:w-auto md:items-center md:gap-3 md:p-2"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sm font-bold text-[#b42332] md:h-10 md:w-10">
              {profile?.name?.trim().charAt(0).toUpperCase() || "S"}
            </span>
            <span className="hidden min-w-0 flex-1 md:block">
              <strong className="block truncate text-sm text-white">
                {profile?.name ?? t.profile}
              </strong>
              <span className="block truncate text-xs text-white/70">
                {profile?.student?.studentCode ?? profile?.email}
              </span>
            </span>
          </Link>
          {workspace.canUseManagementWorkspace ? (
            <button
              type="button"
              disabled={workspace.isSwitching}
              aria-label={t.managementWorkspace}
              onClick={() => workspace.switchWorkspace("ADMIN")}
              className="grid h-10 w-10 place-items-center rounded-xl text-white transition hover:bg-white/15 focus-visible:ring-4 focus-visible:ring-white/30 disabled:cursor-wait disabled:opacity-60 md:mt-2 md:h-9 md:w-full md:grid-cols-[36px_1fr] md:justify-items-start md:px-1"
            >
              <span className="grid h-9 w-9 place-items-center">
                <ArrowLeftRight size={18} />
              </span>
              <span className="hidden text-left text-sm font-semibold md:block">
                {workspace.isSwitching ? t.switchingWorkspace : t.managementWorkspace}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            aria-label={t.logout}
            onClick={workspace.logout}
            className="grid h-10 w-10 place-items-center rounded-xl text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:ring-4 focus-visible:ring-white/30 md:mt-2 md:h-9 md:w-full md:grid-cols-[36px_1fr] md:justify-items-start md:px-1"
          >
            <span className="grid h-9 w-9 place-items-center">
              <LogOut size={18} />
            </span>
            <span className="hidden text-sm font-semibold md:block">{t.logout}</span>
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-4 pb-28 pt-6 sm:px-7 md:px-8 md:pb-10 md:pt-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}
