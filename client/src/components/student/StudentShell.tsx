"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Award,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { studentEventMessages } from "@/i18n/student-event-messages";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useWorkspaceSwitch } from "@/hooks/auth/useWorkspaceSwitch";

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAdminAccess();
  const { locale } = useLanguage();
  const t = studentEventMessages[locale];
  const workspace = useWorkspaceSwitch(profile?.roles.map((role) => role.name) ?? []);
  const links = [
    { href: "/dashboard", label: t.overview, icon: LayoutDashboard },
    ...(profile?.permissions.some(
      (item) => item.permission === "*" || item.permission === "event.read",
    )
      ? [{ href: "/events", label: t.events, icon: CalendarDays }]
      : []),
    ...(profile?.permissions.some(
      (item) => item.permission === "*" || item.permission === "conduct-score.read-own",
    )
      ? [
          {
            href: "/conduct-scores",
            label: locale === "vi" ? "Điểm rèn luyện" : "Conduct Score",
            icon: Award,
          },
        ]
      : []),
    { href: "/profile", label: t.profile, icon: UserRound },
  ];
  return (
    <div className="min-h-[100dvh] bg-[#f3f6fa] md:grid md:grid-cols-[280px_1fr]">
      <aside className="sticky top-0 z-30 flex h-[68px] items-center border-b border-[#dce4ef] bg-white/95 px-4 shadow-[0_12px_32px_-28px_rgba(16,42,80,.7)] backdrop-blur md:h-[100dvh] md:min-h-0 md:flex-col md:items-stretch md:border-b-0 md:border-r md:bg-[#fbfcfe] md:px-4 md:py-5 md:shadow-[10px_0_35px_-28px_rgba(21,74,155,.45)]">
        <div className="flex min-w-0 shrink-0 items-center gap-3 md:h-16 md:justify-between">
          <Link href="/dashboard" aria-label={t.brand}>
            <Image
              src="/images/logo.png"
              alt="TDTU"
              width={612}
              height={338}
              priority
              className="h-auto w-24 object-contain md:w-28"
            />
          </Link>
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-flow-col auto-cols-fr border-t border-[#dbe4ee] bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_35px_-28px_rgba(16,42,80,.75)] backdrop-blur md:static md:mt-7 md:flex md:min-h-0 md:flex-1 md:flex-col md:gap-1.5 md:overflow-y-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition duration-200 md:min-h-11 md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 md:text-sm ${pathname === href ? "bg-[#eaf2fc] text-[#154a9b] md:shadow-[inset_3px_0_0_#154a9b]" : "text-[#60728a] hover:bg-[#f1f5fa] hover:text-[#102a50]"}`}
            >
              <Icon size={19} strokeWidth={pathname === href ? 2.3 : 2} />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 md:ml-0 md:mt-auto md:block md:border-t md:border-[#e1e8f0] md:pt-4">
          <div className="md:hidden">
            <LanguageSwitcher compact />
          </div>
          <Link
            href="/profile"
            aria-label={t.profile}
            className="grid h-10 w-10 place-items-center rounded-xl transition hover:bg-[#edf3fa] md:flex md:h-auto md:w-auto md:items-center md:gap-3 md:p-2"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eaf2fc] text-sm font-bold text-[#154a9b] md:h-10 md:w-10">
              {profile?.name?.trim().charAt(0).toUpperCase() || "S"}
            </span>
            <span className="hidden min-w-0 flex-1 md:block">
              <strong className="block truncate text-sm text-[#102a50]">
                {profile?.name ?? t.profile}
              </strong>
              <span className="block truncate text-xs text-[#718096]">
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
              className="grid h-10 w-10 place-items-center rounded-xl text-[#154a9b] transition hover:bg-[#eaf2fc] focus-visible:ring-4 focus-visible:ring-[#154a9b]/10 disabled:cursor-wait disabled:opacity-60 md:mt-2 md:h-9 md:w-full md:grid-cols-[36px_1fr] md:justify-items-start md:px-1"
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
            className="grid h-10 w-10 place-items-center rounded-xl text-[#66758a] transition hover:bg-[#fff0f1] hover:text-[#bd3343] focus-visible:ring-4 focus-visible:ring-[#bd3343]/10 md:mt-2 md:h-9 md:w-full md:grid-cols-[36px_1fr] md:justify-items-start md:px-1"
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
