"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  KeyRound,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";
import { clearAuthSession, getAuthSession } from "@/lib/auth-storage";
import type { AuthUser } from "@/types/auth";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useAdminTranslations();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [authorizationOpen, setAuthorizationOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const session = getAuthSession();
    if (!session) return router.replace("/admin");
    if (session.user.role === "STUDENT") return router.replace("/dashboard");
    if (session.user.role === "LECTURER" && pathname !== "/admin/dashboard")
      return router.replace("/admin/dashboard");
    setUser(session.user);
    setCollapsed(window.localStorage.getItem("admin.sidebar.collapsed") === "true");
  }, [pathname, router]);
  useEffect(() => setMobileOpen(false), [pathname]);
  if (!user) return <PageLoadingSkeleton />;
  const toggleCollapsed = () =>
    setCollapsed((value) => {
      window.localStorage.setItem("admin.sidebar.collapsed", String(!value));
      return !value;
    });
  const signOut = () => {
    queryClient.clear();
    clearAuthSession();
    router.replace(user.role === "ADMIN" ? "/admin" : "/login");
  };
  const linkClass = (active: boolean) =>
    `group flex min-h-11 w-full items-center rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[.98] ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${active ? `bg-[#e9f1fb] text-[#154a9b] ${collapsed ? "" : "shadow-[inset_3px_0_0_#154a9b]"}` : "text-[#53657d] hover:bg-[#f1f5fa] hover:text-[#102a50]"}`;
  const navItem = (href: string, label: string, icon: ReactNode) => {
    const link = (
      <Link
        href={href}
        aria-current={pathname === href ? "page" : undefined}
        className={linkClass(pathname === href)}
      >
        {icon}
        {!collapsed ? <span>{label}</span> : null}
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
      className={`relative flex h-full flex-col border-r border-[#dce4ef] bg-white px-3 py-4 shadow-[10px_0_35px_-28px_rgba(21,74,155,.45)] transition-all duration-300 ${collapsed ? "w-[82px]" : "w-[268px]"}`}
    >
      <div className={`flex h-16 items-center ${collapsed ? "justify-center" : "px-4"}`}>
        <Link href="/admin/dashboard" className="overflow-hidden" aria-label="TDTU Admin">
          <Image
            src="/images/logo.png"
            alt="TDTU"
            width={612}
            height={338}
            priority
            className={` object-contain transition-all pt-6  ${collapsed ? "w-12" : "w-40"}`}
          />
        </Link>
      </div>
      <Tooltip
        label={collapsed ? t.expand : t.collapse}
        side="right"
        className="absolute left-8 top-1/3 z-20 hidden lg:inline-flex w-full items-center justify-end"
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
      <nav className="mt-7 flex-1 space-y-1.5" aria-label="Admin navigation">
        {navItem("/admin/dashboard", t.dashboard, <LayoutDashboard size={18} strokeWidth={2} />)}
        {user.role === "ADMIN"
          ? navItem("/admin/users", t.users, <Users size={18} strokeWidth={2} />)
          : null}
        {user.role === "ADMIN" ? (
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
                  <Link
                    href="/admin/roles"
                    className={`ml-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${pathname === "/admin/roles" ? "text-[#154a9b]" : "text-[#66758a] hover:bg-[#f3f6fa]"}`}
                  >
                    <ShieldCheck size={16} />
                    {t.roles}
                  </Link>
                  <Link
                    href="/admin/permissions"
                    className={`ml-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${pathname === "/admin/permissions" ? "text-[#154a9b]" : "text-[#66758a] hover:bg-[#f3f6fa]"}`}
                  >
                    <KeyRound size={16} />
                    {t.permissions}
                  </Link>
                </div>
              </div>
            </div>
          )
        ) : null}
      </nav>
      <div className="space-y-2 border-t border-[#e4eaf1] pt-4">
        {!collapsed ? (
          <div className="flex items-center gap-2 px-2 pb-2">
            <Languages size={16} className="text-[#718096]" />
            <span className="mr-auto text-xs font-semibold text-[#718096]">{t.language}</span>
            <LanguageSwitcher />
          </div>
        ) : null}
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
          ) : (
            <button
              type="button"
              onClick={signOut}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d9e2ed] bg-white px-3 py-2 text-xs font-bold text-[#52647d] transition hover:border-[#e7aeb5] hover:text-[#bd3343] active:scale-[.98]"
            >
              <LogOut size={15} />
              {t.logout}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
  return (
    <div
      className={`min-h-[100dvh] bg-[#f5f7fb] lg:grid ${collapsed ? "lg:grid-cols-[82px_1fr]" : "lg:grid-cols-[268px_1fr]"}`}
    >
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>
      <div className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-[#dce4ef] bg-white/95 px-4 backdrop-blur lg:hidden">
        <Image
          src="/images/logo.png"
          alt="TDTU"
          width={612}
          height={338}
          className="h-auto w-32 object-contain"
        />
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
          <div className="h-full w-[268px]">{sidebar}</div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="absolute left-[280px] top-4 grid h-10 w-10 place-items-center rounded-xl bg-white text-[#102a50]"
          >
            <X size={19} />
          </button>
        </div>
      ) : null}
      <main className="min-w-0 pt-16 lg:col-start-2 lg:pt-0">
        <div className="mx-auto max-w-[1440px] p-4 sm:p-7 lg:p-9">{children}</div>
      </main>
    </div>
  );
}
