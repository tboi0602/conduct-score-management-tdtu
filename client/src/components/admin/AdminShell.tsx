"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftRight,
  ChevronDown,
  CalendarDays,
  CalendarRange,
  ListChecks,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Users,
  Building2,
  BookOpen,
  School,
  Network,
  GraduationCap,
  X,
  ScanLine,
  Award,
  MessageSquareWarning,
} from "lucide-react";
import { type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useAdminSidebar } from "@/hooks/layout/useAdminSidebar";
import { useWorkspaceSwitch } from "@/hooks/auth/useWorkspaceSwitch";
import { usePendingAppealsCount } from "@/hooks/appeals/usePendingAppealsCount";

export function AdminShell({ children }: { children: ReactNode }) {
  const {
    pathname,
    user,
    collapsed,
    authorizationOpen,
    academicOpen,
    eventOpen,
    mobileOpen,
    setCollapsed,
    setAuthorizationOpen,
    setAcademicOpen,
    setEventOpen,
    setMobileOpen,
    toggleCollapsed,
    signOut,
  } = useAdminSidebar();
  const { t, locale } = useAdminTranslations();
  const academicLabels =
    locale === "vi"
      ? {
          group: "Đơn vị đào tạo",
          faculties: "Danh mục Khoa",
          majors: "Danh mục Ngành",
          classes: "Danh mục Lớp",
          organizers: "Danh mục Tổ chức",
        }
      : {
          group: "Academic units",
          faculties: "Faculty catalog",
          majors: "Major catalog",
          classes: "Class catalog",
          organizers: "Organization catalog",
        };
  const eventLabels =
    locale === "vi"
      ? {
          group: "Quản lý sự kiện",
          events: "Danh mục Sự kiện",
          criteria: "Danh mục Tiêu chí",
          semesters: "Danh mục Học kỳ",
          attendance: "Điểm danh",
        }
      : {
          group: "Event management",
          events: "Event catalog",
          criteria: "Criteria catalog",
          semesters: "Semester catalog",
          attendance: "Attendance",
        };
  const { can, profile } = useAdminAccess();
  const pendingAppealsCount = usePendingAppealsCount(can("appeal.read"));
  const workspace = useWorkspaceSwitch(profile?.roles.map((role) => role.name) ?? []);
  if (!user) return <PageLoadingSkeleton />;
  const canManageAcademicCatalog =
    can("academic.create") || can("academic.update") || can("academic.delete");
  const canManageClasses = can("academic.class.create") || can("academic.class.update");
  const canManageOrganizers =
    can("organizer.create") || can("organizer.update") || can("organizer.delete");
  const showAcademicGroup = canManageAcademicCatalog || canManageClasses || canManageOrganizers;
  const conductScoreLabel = locale === "vi" ? "Điểm rèn luyện" : "Conduct Scores";
  const linkClass = (active: boolean) =>
    `group relative flex min-h-11 w-full items-center rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[.98] ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${active ? `bg-[#e9f1fb] text-[#154a9b] ${collapsed ? "" : "shadow-[inset_3px_0_0_#154a9b]"}` : "text-[#53657d] hover:bg-[#f1f5fa] hover:text-[#102a50]"}`;
  const navItem = (href: string, label: string, icon: ReactNode, badge?: number) => {
    const link = (
      <Link
        href={href}
        aria-current={pathname === href ? "page" : undefined}
        aria-label={label}
        className={linkClass(pathname === href)}
      >
        {icon}
        {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
        {badge ? (
          <span
            className={`${collapsed ? "absolute right-1 top-1" : "ml-auto"} grid min-h-5 min-w-5 place-items-center rounded-full bg-[#b42332] px-1 text-[10px] font-bold text-white`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </Link>
    );
    return collapsed ? (
      <Tooltip key={href} label={label} side="right" className="w-full">
        {link}
      </Tooltip>
    ) : (
      <span key={href} className="block w-full">
        {link}
      </span>
    );
  };
  const sidebar = (
    <aside
      onWheel={(event) => {
        const navigation = event.currentTarget.querySelector<HTMLElement>("[data-sidebar-scroll]");
        if (!navigation) return;
        navigation.scrollTop += event.deltaY;
        event.preventDefault();
        event.stopPropagation();
      }}
      className={`relative flex h-full min-h-0 flex-col overscroll-contain border-r border-[#d8e2ed] bg-[#fbfcfe] px-3 py-4 shadow-[12px_0_38px_-30px_rgba(16,42,80,.55)] transition-all duration-300 ${collapsed ? "w-[82px]" : "w-[276px]"}`}
    >
      <div
        className={`flex h-16 shrink-0 items-center gap-2 pt-2 ${collapsed ? "justify-center" : "justify-between px-1"}`}
      >
        <Link href="/admin/dashboard" className="overflow-hidden" aria-label="TDTU Admin">
          <Image
            src="/images/logo.png"
            alt="TDTU"
            width={612}
            height={338}
            priority
            className={`object-contain transition-all ${collapsed ? "w-10" : "w-28"}`}
          />
        </Link>
        {!collapsed ? <LanguageSwitcher /> : null}
      </div>
      {collapsed ? (
        <div className="flex shrink-0 justify-center pt-2">
          <LanguageSwitcher compact />
        </div>
      ) : null}
      <Tooltip
        label={collapsed ? t.expand : t.collapse}
        side="right"
        className="absolute left-[100%] top-1/3 z-50 hidden lg:block w-fit"
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? t.expand : t.collapse}
          className="grid h-9 w-9 place-items-center rounded-full border border-[#d5dfeb] bg-white text-[#60728a] shadow-[0_8px_20px_-10px_rgba(16,42,80,.45)] transition hover:border-[#9fb7d5] hover:text-[#154a9b] active:scale-[.95]"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </Tooltip>
      <nav
        data-sidebar-scroll
        className="mt-7 min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden overscroll-contain pr-1"
        aria-label={t.adminNavigation}
      >
        {can("dashboard.read")
          ? navItem("/admin/dashboard", t.dashboard, <LayoutDashboard size={18} strokeWidth={2} />)
          : null}
        {can("event.read") || can("criteria.read") || can("semester.read") ? (
          collapsed ? (
            <Tooltip label={eventLabels.group} side="right" className="w-full">
              <button
                type="button"
                onClick={() => {
                  setCollapsed(false);
                  setEventOpen(true);
                }}
                className={linkClass(
                  pathname.startsWith("/admin/events") ||
                    pathname === "/admin/criteria" ||
                    pathname === "/admin/semesters",
                )}
              >
                <CalendarDays size={18} />
              </button>
            </Tooltip>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setEventOpen((value) => !value)}
                aria-expanded={eventOpen}
                className={`${linkClass(pathname.startsWith("/admin/events") || pathname === "/admin/criteria" || pathname === "/admin/semesters")} w-full justify-between`}
              >
                <span className="flex items-center gap-3">
                  <CalendarDays size={18} />
                  <span>{eventLabels.group}</span>
                </span>
                <ChevronDown
                  size={15}
                  className={`transition-transform ${eventOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ${eventOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              >
                <div className="min-h-0 space-y-1 pt-1">
                  {can("event.read") ? (
                    <Link
                      href="/admin/events"
                      className={`ml-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${pathname === "/admin/events" ? "text-[#154a9b]" : "text-[#66758a] hover:bg-[#f3f6fa]"}`}
                    >
                      <CalendarDays size={16} />
                      {eventLabels.events}
                    </Link>
                  ) : null}
                  {can("criteria.read") ? (
                    <Link
                      href="/admin/criteria"
                      className={`ml-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${pathname === "/admin/criteria" ? "text-[#154a9b]" : "text-[#66758a] hover:bg-[#f3f6fa]"}`}
                    >
                      <ListChecks size={16} />
                      {eventLabels.criteria}
                    </Link>
                  ) : null}
                  {can("semester.read") ? (
                    <Link
                      href="/admin/semesters"
                      className={`ml-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${pathname === "/admin/semesters" ? "text-[#154a9b]" : "text-[#66758a] hover:bg-[#f3f6fa]"}`}
                    >
                      <CalendarRange size={16} />
                      {eventLabels.semesters}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          )
        ) : null}
        {showAcademicGroup ? (
          collapsed ? (
            <Tooltip label={academicLabels.group} side="right" className="w-full">
              <button
                type="button"
                onClick={() => {
                  setCollapsed(false);
                  setAcademicOpen(true);
                }}
                className={linkClass(
                  pathname.startsWith("/admin/academic") || pathname === "/admin/organizers",
                )}
              >
                <GraduationCap size={18} />
              </button>
            </Tooltip>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setAcademicOpen((value) => !value)}
                aria-expanded={academicOpen}
                className={`${linkClass(pathname.startsWith("/admin/academic") || pathname === "/admin/organizers")} w-full justify-between`}
              >
                <span className="flex items-center gap-3">
                  <GraduationCap size={18} />
                  <span>{academicLabels.group}</span>
                </span>
                <ChevronDown
                  size={15}
                  className={`transition-transform ${academicOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ${academicOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              >
                <div className="min-h-0 space-y-1 pt-1">
                  {canManageAcademicCatalog ? (
                    <>
                      <Link
                        href="/admin/academic/faculties"
                        className={`ml-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${pathname === "/admin/academic/faculties" ? "text-[#154a9b]" : "text-[#66758a] hover:bg-[#f3f6fa]"}`}
                      >
                        <Building2 size={16} />
                        {academicLabels.faculties}
                      </Link>
                      <Link
                        href="/admin/academic/majors"
                        className={`ml-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${pathname === "/admin/academic/majors" ? "text-[#154a9b]" : "text-[#66758a] hover:bg-[#f3f6fa]"}`}
                      >
                        <BookOpen size={16} />
                        {academicLabels.majors}
                      </Link>
                    </>
                  ) : null}
                  {canManageClasses ? (
                    <Link
                      href="/admin/academic/classes"
                      className={`ml-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${pathname === "/admin/academic/classes" ? "text-[#154a9b]" : "text-[#66758a] hover:bg-[#f3f6fa]"}`}
                    >
                      <School size={16} />
                      {academicLabels.classes}
                    </Link>
                  ) : null}
                  {canManageOrganizers ? (
                    <Link
                      href="/admin/organizers"
                      className={`ml-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${pathname === "/admin/organizers" ? "text-[#154a9b]" : "text-[#66758a] hover:bg-[#f3f6fa]"}`}
                    >
                      <Network size={16} />
                      {academicLabels.organizers}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          )
        ) : null}
        {can("attendance.read") || can("attendance.manage") || can("attendance.session.manage")
          ? navItem(
              "/admin/attendance",
              eventLabels.attendance,
              <ScanLine size={18} strokeWidth={2} />,
            )
          : null}
        {can("conduct-score.read")
          ? navItem("/admin/conduct-scores", conductScoreLabel, <Award size={18} strokeWidth={2} />)
          : null}
        {can("appeal.read")
          ? navItem(
              "/admin/appeals",
              locale === "vi" ? "Khiếu nại" : "Appeals",
              <MessageSquareWarning size={18} strokeWidth={2} />,
              pendingAppealsCount,
            )
          : null}
        {can("user.read") || can("student.read") || can("faculty-staff.read")
          ? navItem("/admin/users", t.users, <Users size={18} strokeWidth={2} />)
          : null}
        {can("role.read") || can("permission.read") ? (
          collapsed ? (
            <Tooltip label={t.authorization} side="right" className="w-full">
              <button
                type="button"
                onClick={() => {
                  setCollapsed(false);
                  setAuthorizationOpen(true);
                }}
                className={linkClass(
                  pathname.startsWith("/admin/roles") || pathname.startsWith("/admin/permissions"),
                )}
              >
                <ShieldCheck size={18} />
              </button>
            </Tooltip>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setAuthorizationOpen((value) => !value)}
                aria-expanded={authorizationOpen}
                className={`${linkClass(pathname.startsWith("/admin/roles") || pathname.startsWith("/admin/permissions"))} w-full justify-between`}
              >
                <span className="flex items-center gap-3">
                  <ShieldCheck size={18} />
                  <span>{t.authorization}</span>
                </span>
                <ChevronDown
                  size={15}
                  className={`transition-transform ${authorizationOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ${authorizationOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              >
                <div className="min-h-0 space-y-1 pt-1">
                  {can("role.read") ? (
                    <Link
                      href="/admin/roles"
                      className={`ml-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${pathname === "/admin/roles" ? "text-[#154a9b]" : "text-[#66758a] hover:bg-[#f3f6fa]"}`}
                    >
                      <ShieldCheck size={16} />
                      {t.roles}
                    </Link>
                  ) : null}
                  {can("permission.read") ? (
                    <Link
                      href="/admin/permissions"
                      className={`ml-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${pathname === "/admin/permissions" ? "text-[#154a9b]" : "text-[#66758a] hover:bg-[#f3f6fa]"}`}
                    >
                      <KeyRound size={16} />
                      {t.permissions}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          )
        ) : null}
      </nav>
      <div className="shrink-0 space-y-2 border-t border-[#e4eaf1] bg-white pt-4">
        <div className={`rounded-2xl bg-[#f2f6fb] ${collapsed ? "p-2" : "p-3"}`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#154a9b] text-sm font-bold text-white">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#102a50]">{user.name}</p>
                <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-[#718096]">
                  {user.role}
                </p>
              </div>
            ) : null}
          </div>
          {collapsed ? (
            <>
              {workspace.canUseStudentWorkspace ? (
                <Tooltip label={t.studentWorkspace} side="right" className="w-full">
                  <button
                    type="button"
                    disabled={workspace.isSwitching}
                    onClick={() => workspace.switchWorkspace("STUDENT")}
                    aria-label={t.studentWorkspace}
                    className="mt-2 grid h-9 w-full place-items-center rounded-xl text-[#154a9b] transition hover:bg-[#e3edf9] disabled:cursor-wait disabled:opacity-60"
                  >
                    <ArrowLeftRight size={17} />
                  </button>
                </Tooltip>
              ) : null}
              <Tooltip label={t.logout} side="right" className="w-full">
                <button
                  type="button"
                  onClick={signOut}
                  aria-label={t.logout}
                  className="mt-2 grid h-9 w-full place-items-center rounded-xl text-[#bd3343] transition hover:bg-[#ffecef]"
                >
                  <LogOut size={17} />
                </button>
              </Tooltip>
            </>
          ) : (
            <>
              {workspace.canUseStudentWorkspace ? (
                <button
                  type="button"
                  disabled={workspace.isSwitching}
                  onClick={() => workspace.switchWorkspace("STUDENT")}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#bed0e7] bg-[#edf4fc] px-3 py-2 text-xs font-bold text-[#154a9b] transition hover:bg-[#e3edf9] active:scale-[.98] disabled:cursor-wait disabled:opacity-60"
                >
                  <ArrowLeftRight size={15} />
                  {workspace.isSwitching ? t.switchingWorkspace : t.studentWorkspace}
                </button>
              ) : null}
              <button
                type="button"
                onClick={signOut}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d9e2ed] bg-white px-3 py-2 text-xs font-bold text-[#52647d] transition hover:border-[#e7aeb5] hover:text-[#bd3343] active:scale-[.98]"
              >
                <LogOut size={15} />
                {t.logout}
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
  return (
    <div
      className={`min-h-[100dvh] bg-[#f3f6fa] lg:grid ${collapsed ? "lg:grid-cols-[82px_1fr]" : "lg:grid-cols-[276px_1fr]"}`}
    >
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>
      <div className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-[#dce4ef] bg-white/95 px-4 backdrop-blur lg:hidden">
        <div>
          <Image
            src="/images/logo.png"
            alt="TDTU"
            width={40}
            height={40}
            className="w-24 object-contain "
          />
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Menu"
          className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4fc] text-[#154a9b]"
        >
          <Menu size={20} />
        </button>
      </div>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-[#0b1f3a]/35 backdrop-blur-[2px] lg:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMobileOpen(false);
          }}
        >
          <div className="h-full w-[276px]">{sidebar}</div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="absolute left-[288px] top-4 grid h-10 w-10 place-items-center rounded-xl bg-white text-[#102a50] shadow-[0_10px_28px_-16px_rgba(11,31,58,.6)]"
          >
            <X size={19} />
          </button>
        </div>
      ) : null}
      <main className="min-w-0 pt-16 lg:col-start-2 lg:pt-0">
        <div className="mx-auto max-w-[1480px] px-4 pb-10 pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pt-9">
          {children}
        </div>
      </main>
    </div>
  );
}
