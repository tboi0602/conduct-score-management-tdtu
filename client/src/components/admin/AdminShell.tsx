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
  UserRoundCog,
  Building2,
  BookOpen,
  School,
  Network,
  GraduationCap,
  X,
  ScanLine,
  Award,
  MessageSquareWarning,
  FileText,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { GlobalSearch } from "@/components/admin/GlobalSearch";
import { useAdminSidebar } from "@/hooks/layout/useAdminSidebar";
import { useWorkspaceSwitch } from "@/hooks/auth/useWorkspaceSwitch";
import { usePendingAppealsCount } from "@/hooks/appeals/usePendingAppealsCount";

export function AdminShell({ children }: { children: ReactNode }) {
  const [usersOpen, setUsersOpen] = useState(false);
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
  const canAssignUserRoles = can("user.assign-role");
  const pendingAppealsCount = usePendingAppealsCount(can("appeal.read"));
  const workspace = useWorkspaceSwitch(profile?.isStudent);
  if (!user) return <PageLoadingSkeleton />;
  const canManageAcademicCatalog =
    can("academic.create") || can("academic.update") || can("academic.delete");
  const canManageClasses = can("academic.class.create") || can("academic.class.update");
  const canManageOrganizers =
    can("organizer.create") || can("organizer.update") || can("organizer.delete");
  const showAcademicGroup = canManageAcademicCatalog || canManageClasses || canManageOrganizers;
  const conductScoreLabel = locale === "vi" ? "Điểm rèn luyện" : "Conduct Scores";
  const groupParentClass = (active: boolean) =>
    `group relative flex min-h-11 w-full items-center rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[.98] ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`;
  const linkClass = (active: boolean) =>
    `group relative flex min-h-11 w-full items-center rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[.98] ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${active ? "bg-white text-[#154273]" : "text-white/80 hover:bg-white/10 hover:text-white"}`;
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
      className={` relative flex h-full min-h-0 flex-col overscroll-contain border-r border-[#0f3157] bg-[#154273] px-3 py-4 text-white transition-all duration-300 ${collapsed ? "w-[82px]" : "w-[244px]"}`}
    >
      <div
        className={`flex shrink-0 items-center ${collapsed ? "justify-center" : "justify-between"}`}
      >
        <Link href="/admin/dashboard" aria-label="TDTU Admin">
          <Image
            src="/images/logo.png"
            alt="TDTU"
            width={612}
            height={338}
            priority
            className={`h-auto object-contain transition-all ${collapsed ? "w-20" : "w-48"}`}
          />
        </Link>
        {!collapsed ? <LanguageSwitcher /> : null}
      </div>
      {collapsed ? (
        <div className="flex shrink-0 justify-center pt-2">
          <LanguageSwitcher compact />
        </div>
      ) : null}
      <GlobalSearch collapsed={collapsed} />
      <nav
        data-sidebar-scroll
        className="my-2 min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1"
        aria-label={t.adminNavigation}
      >
        {can("dashboard.read")
          ? navItem("/admin/dashboard", t.dashboard, <LayoutDashboard size={18} strokeWidth={2} />)
          : null}
        {can("dashboard.read")
          ? navItem(
              "/admin/reports",
              locale === "vi" ? "Báo cáo" : "Reports",
              <FileText size={18} />,
            )
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
                className={groupParentClass(
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
                className={`${groupParentClass(pathname.startsWith("/admin/events") || pathname === "/admin/criteria" || pathname === "/admin/semesters")} w-full justify-between`}
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
                <div className="ml-5 min-h-0 space-y-1 border-l border-white/25 pl-2.5 pt-1">
                  {can("event.read") ? (
                    <Link
                      href="/admin/events"
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/admin/events" ? "bg-white text-[#154273]" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
                    >
                      <CalendarDays size={16} />
                      {eventLabels.events}
                    </Link>
                  ) : null}
                  {can("criteria.read") ? (
                    <Link
                      href="/admin/criteria"
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/admin/criteria" ? "bg-white text-[#154273]" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
                    >
                      <ListChecks size={16} />
                      {eventLabels.criteria}
                    </Link>
                  ) : null}
                  {can("semester.read") ? (
                    <Link
                      href="/admin/semesters"
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/admin/semesters" ? "bg-white text-[#154273]" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
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
                className={groupParentClass(
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
                className={`${groupParentClass(pathname.startsWith("/admin/academic") || pathname === "/admin/organizers")} w-full justify-between`}
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
                <div className="ml-5 min-h-0 space-y-1 border-l border-white/25 pl-2.5 pt-1">
                  {canManageAcademicCatalog ? (
                    <>
                      <Link
                        href="/admin/academic/faculties"
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/admin/academic/faculties" ? "bg-white text-[#154273]" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
                      >
                        <Building2 size={16} />
                        {academicLabels.faculties}
                      </Link>
                      <Link
                        href="/admin/academic/majors"
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/admin/academic/majors" ? "bg-white text-[#154273]" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
                      >
                        <BookOpen size={16} />
                        {academicLabels.majors}
                      </Link>
                    </>
                  ) : null}
                  {canManageClasses ? (
                    <Link
                      href="/admin/academic/classes"
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/admin/academic/classes" ? "bg-white text-[#154273]" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
                    >
                      <School size={16} />
                      {academicLabels.classes}
                    </Link>
                  ) : null}
                  {canManageOrganizers ? (
                    <Link
                      href="/admin/organizers"
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/admin/organizers" ? "bg-white text-[#154273]" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
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
        {can("user.read") || can("student.read") || can("faculty-staff.read") ? (
          collapsed ? (
            <Tooltip label={t.users} side="right" className="w-full">
              <button
                type="button"
                onClick={() => {
                  setCollapsed(false);
                  setUsersOpen(true);
                }}
                className={groupParentClass(pathname.startsWith("/admin/users"))}
              >
                <Users size={18} />
              </button>
            </Tooltip>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setUsersOpen((value) => !value)}
                aria-expanded={usersOpen}
                className={`${groupParentClass(pathname.startsWith("/admin/users"))} w-full justify-between`}
              >
                <span className="flex items-center gap-3">
                  <Users size={18} />
                  <span>{t.users}</span>
                </span>
                <ChevronDown
                  size={15}
                  className={`transition-transform ${usersOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ${usersOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              >
                <div className="ml-5 min-h-0 space-y-1 border-l border-white/25 pl-2.5 pt-1">
                  <Link
                    href="/admin/users/students"
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/admin/users/students" ? "bg-white text-[#154273]" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
                  >
                    <Users size={16} />
                    {locale === "vi" ? "Sinh viên" : "Students"}
                  </Link>
                  <Link
                    href="/admin/users/staff"
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/admin/users/staff" ? "bg-white text-[#154273]" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
                  >
                    <UserRoundCog size={16} />
                    {locale === "vi" ? "Nhân sự" : "Staff"}
                  </Link>
                </div>
              </div>
            </div>
          )
        ) : null}
        {can("role.read") || can("permission.read") || canAssignUserRoles ? (
          collapsed ? (
            <Tooltip label={t.authorization} side="right" className="w-full">
              <button
                type="button"
                onClick={() => {
                  setCollapsed(false);
                  setAuthorizationOpen(true);
                }}
                className={linkClass(
                  pathname.startsWith("/admin/roles") ||
                    pathname.startsWith("/admin/permissions") ||
                    pathname === "/admin/role-assignment",
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
                className={`${groupParentClass(pathname.startsWith("/admin/roles") || pathname.startsWith("/admin/permissions") || pathname === "/admin/role-assignment")} w-full justify-between`}
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
                <div className="ml-5 min-h-0 space-y-1 border-l border-white/25 pl-2.5 pt-1">
                  {canAssignUserRoles ? (
                    <Link
                      href="/admin/role-assignment"
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/admin/role-assignment" ? "bg-white text-[#154273]" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
                    >
                      <Users size={16} />
                      {t.roleAssignment}
                    </Link>
                  ) : null}
                  {can("role.read") ? (
                    <Link
                      href="/admin/roles"
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/admin/roles" ? "bg-white text-[#154273]" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
                    >
                      <ShieldCheck size={16} />
                      {t.roles}
                    </Link>
                  ) : null}
                  {can("permission.read") ? (
                    <Link
                      href="/admin/permissions"
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/admin/permissions" ? "bg-white text-[#154273]" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
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
      <div className="shrink-0 space-y-2 border-t pt-4 border-white/30 bg-transparent ">
        <div className={`rounded-2xl bg-transparent`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-sm font-bold text-[#154273]">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{user.name}</p>
                <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-white/75">
                  {profile?.roles[0]?.displayName || profile?.roles[0]?.code || user.role}
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
                    className="mt-2 grid h-9 w-full place-items-center rounded-lg text-[#154a9b] transition hover:bg-[#e3edf9] disabled:cursor-wait disabled:opacity-60"
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
                  className="mt-2 grid h-9 w-full place-items-center rounded-lg text-[#bd3343] transition hover:bg-[#ffecef]"
                >
                  <LogOut size={17} />
                </button>
              </Tooltip>
              <Tooltip label={t.expand} side="right" className="hidden w-full lg:block">
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  aria-label={t.expand}
                  className="mt-2 grid h-9 w-full place-items-center rounded-lg text-[#fcfcfd] transition hover:bg-[#edf4fc] hover:text-[#154a9b]"
                >
                  <PanelLeftOpen size={17} />
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
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#bed0e7] bg-[#edf4fc] px-3 py-2 text-xs font-bold text-[#154a9b] transition hover:bg-[#e3edf9] active:scale-[.98] disabled:cursor-wait disabled:opacity-60"
                >
                  <ArrowLeftRight size={15} />
                  {workspace.isSwitching ? t.switchingWorkspace : t.studentWorkspace}
                </button>
              ) : null}
              <button
                type="button"
                onClick={signOut}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#d9e2ed] bg-white px-3 py-2 text-xs font-bold text-[#52647d] transition hover:border-[#e7aeb5] hover:text-[#bd3343] active:scale-[.98]"
              >
                <LogOut size={15} />
                {t.logout}
              </button>
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={t.collapse}
                className="mt-2 hidden w-full items-center justify-center gap-2 rounded-lg border border-[#d9e2ed]/30 bg-white/10 px-3 py-2 text-xs font-bold text-white/60 transition hover:border-[#d9e2ed]/40 hover:text-white active:scale-[.98] lg:flex"
              >
                <PanelLeftClose size={15} />
                {t.collapse}
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
  return (
    <div
      className={`min-h-[100dvh] bg-[#f3f6fa] lg:grid ${collapsed ? "lg:grid-cols-[82px_1fr]" : "lg:grid-cols-[244px_1fr]"}`}
    >
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>
      <div className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-[#dce4ef] bg-white/95 px-4 backdrop-blur lg:hidden">
        <div>
          <Image
            src="/images/logo.png"
            alt="TDTU"
            width={160}
            height={64}
            className=" w-24 object-contain"
          />
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Menu"
          className="grid h-10 w-10 place-items-center rounded-lg bg-[#edf4fc] text-[#154a9b]"
        >
          <Menu size={20} />
        </button>
      </div>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-[#0b1f3a]/35 backdrop-blur-[2px] lg:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMobileOpen(false);
          }}
        >
          <div className="h-full w-[276px]">{sidebar}</div>
        </div>
      ) : null}
      <main className="h-dvh min-w-0 overflow-hidden pt-16 lg:col-start-2 lg:pt-0">
        <div className="h-full w-full overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
