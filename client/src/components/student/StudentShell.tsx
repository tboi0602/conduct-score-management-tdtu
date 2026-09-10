"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Award,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { studentEventMessages } from "@/i18n/student-event-messages";
import { clearAuthSession } from "@/lib/auth-storage";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useWorkspaceSwitch } from "@/hooks/useWorkspaceSwitch";

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
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
    <div className="min-h-[100dvh] bg-[#f5f7fb] md:grid md:grid-cols-[268px_1fr]">
      <aside className="flex border-b border-[#dce4ef] bg-white px-4 py-3 shadow-[10px_0_35px_-28px_rgba(21,74,155,.45)] md:sticky md:top-0 md:h-[100dvh] md:min-h-0 md:flex-col md:border-b-0 md:border-r md:px-4 md:py-5">
        <div className="flex shrink-0 items-center gap-3 md:h-16 md:justify-between">
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
          <div>
            <LanguageSwitcher />
          </div>
        </div>
        <nav className="ml-3 flex flex-1 gap-2 overflow-x-auto md:ml-0 md:mt-7 md:min-h-0 md:flex-col md:overflow-y-auto md:overflow-x-hidden">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${pathname === href ? "bg-[#eaf2fc] text-[#154a9b] shadow-[inset_3px_0_0_#154a9b]" : "text-[#53657d] hover:bg-[#f1f5fa] hover:text-[#102a50]"}`}
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0 md:mt-auto md:block md:border-t md:border-[#e4eaf2] md:pt-4">
          <Link
            href="/profile"
            className="hidden items-center gap-3 rounded-xl p-2 hover:bg-[#f3f6fa] md:flex"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf2fc] text-sm font-bold text-[#154a9b]">
              {profile?.name?.trim().charAt(0).toUpperCase() || "S"}
            </span>
            <span className="min-w-0 flex-1">
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
              className="grid h-9 w-9 place-items-center rounded-xl text-[#154a9b] transition hover:bg-[#eaf2fc] disabled:cursor-wait disabled:opacity-60 md:mt-2 md:w-full md:grid-cols-[36px_1fr] md:justify-items-start md:px-1"
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
            onClick={() => {
              queryClient.clear();
              clearAuthSession();
              router.replace("/login");
            }}
            className="grid h-9 w-9 place-items-center rounded-xl text-[#66758a] hover:bg-[#fff0f1] hover:text-[#bd3343] md:mt-2 md:w-full md:grid-cols-[36px_1fr] md:justify-items-start md:px-1"
          >
            <span className="grid h-9 w-9 place-items-center">
              <LogOut size={18} />
            </span>
            <span className="hidden text-sm font-semibold md:block">{t.logout}</span>
          </button>
        </div>
      </aside>
      <main className="min-w-0 p-5 sm:p-8">{children}</main>
    </div>
  );
}
