"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Award,
  Bell,
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  QrCode,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { AttendanceFailureWatcher } from "@/components/student/AttendanceFailureWatcher";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useWorkspaceSwitch } from "@/hooks/auth/useWorkspaceSwitch";
import { useStudentNavigation } from "@/hooks/layout/useStudentNavigation";
import { getAuthSession } from "@/lib/auth-storage";
import { studentEventMessages } from "@/i18n/student-event-messages";

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { profile } = useAdminAccess();
  const { locale } = useLanguage();
  const t = studentEventMessages[locale];

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setIsAuthorized(true);
  }, [router]);
  const workspace = useWorkspaceSwitch(profile?.roles.map((role) => role.name) ?? []);
  const has = (permission: string) =>
    profile?.permissions.some(
      (item) => item.permission === "*" || item.permission === permission,
    ) ?? false;
  const canAppeal = has("appeal.read-own");
  const canReadNotifications = has("notification.read-own");
  const navigation = useStudentNavigation(canAppeal, canReadNotifications);
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const links = [
    { href: "/dashboard", label: t.overview, icon: LayoutDashboard },
    ...(has("event.read") ? [{ href: "/events", label: t.events, icon: CalendarDays }] : []),
    ...(has("conduct-score.read-own")
      ? [{ href: "/conduct-scores", label: t.conductScoreResults, icon: Award }]
      : []),
    { href: "/qr-scan", label: t.qrScanner, icon: QrCode },
    { href: "/schedule", label: t.schedule, icon: CalendarRange },
    { href: "/profile", label: t.studentInformation, icon: UserRound },
    ...(canAppeal
      ? [
          {
            href: "/appeals",
            label: t.appeals,
            icon: MessageSquareWarning,
            badge: navigation.pendingAppeals,
          },
        ]
      : []),
    ...(canReadNotifications
      ? [
          {
            href: "/notifications",
            label: t.notifications,
            icon: Bell,
            badge: navigation.unreadNotifications,
          },
        ]
      : []),
  ];

  const sidebar = (
    <aside className="flex h-full min-h-0 w-[276px] flex-col border-r border-[#d8e2ed] bg-[#fbfcfe] px-3 py-4 shadow-[12px_0_38px_-30px_rgba(16,42,80,.55)]">
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 px-1 pt-2">
        <Link href="/dashboard" aria-label={t.brand} className="overflow-hidden rounded-xl">
          <Image
            src="/images/logo.png"
            alt="TDTU"
            width={612}
            height={338}
            priority
            className="w-28 object-contain"
          />
        </Link>
        <LanguageSwitcher />
      </div>
      <nav
        className="mt-7 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1"
        aria-label={t.brand}
      >
        {links.map(({ href, label, icon: Icon, badge }) => {
          const active =
            pathname === href || (href === "/events" && pathname.startsWith("/events/"));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition active:scale-[.98] ${active ? "bg-[#e9f1fb] text-[#154a9b] shadow-[inset_3px_0_0_#154a9b]" : "text-[#53657d] hover:bg-[#f1f5fa] hover:text-[#102a50]"}`}
            >
              <Icon size={18} strokeWidth={2} />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {badge ? (
                <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-[#b42332] px-1 text-[10px] font-bold text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 space-y-2 border-t border-[#e4eaf1] bg-white pt-4">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-2xl bg-[#f2f6fb] p-3 transition hover:bg-[#eaf1f9]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#154a9b] text-sm font-bold text-white">
            {profile?.name?.trim().charAt(0).toUpperCase() || "S"}
          </span>
          <span className="min-w-0">
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
            onClick={() => workspace.switchWorkspace("ADMIN")}
            className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#53657d] transition hover:bg-[#f1f5fa] hover:text-[#154a9b] disabled:opacity-50"
          >
            <ArrowLeftRight size={18} />{" "}
            {workspace.isSwitching ? t.switchingWorkspace : t.managementWorkspace}
          </button>
        ) : null}
        <button
          type="button"
          onClick={workspace.logout}
          className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#53657d] transition hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={18} /> {t.logout}
        </button>
      </div>
    </aside>
  );

  if (!isAuthorized) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#f5f7fa] lg:grid lg:grid-cols-[276px_1fr]">
      <AttendanceFailureWatcher />
      <div className="sticky top-0 hidden h-[100dvh] min-h-0 lg:block">{sidebar}</div>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#d8e2ed] bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard">
          <Image
            src="/images/logo.png"
            alt="TDTU"
            width={612}
            height={338}
            className="w-24 object-contain"
          />
        </Link>
        <button
          type="button"
          aria-label={t.openMenu}
          onClick={() => setMobileOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-[#d5dfeb] text-[#154a9b]"
        >
          <Menu size={20} />
        </button>
      </header>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t.closeMenu}
            className="absolute inset-0 bg-[#0b1f3a]/45 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 max-w-[88vw] animate-[slide-in_.25s_ease-out]">
            {sidebar}
          </div>
          <button
            type="button"
            aria-label={t.closeMenu}
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl bg-white text-[#154a9b] shadow-lg"
          >
            <X size={19} />
          </button>
        </div>
      ) : null}
      <main id="main-content" className="min-w-0 px-4 pb-10 pt-6 sm:px-7 lg:px-10 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
