"use client";

import Link from "next/link";
import { ArrowUpRight, KeyRound, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";
import { getAuthSession } from "@/lib/auth-storage";
import { adminService } from "@/services/admin";
import type { AuthUser } from "@/types/auth";
import { queryKeys } from "@/lib/query-keys";

export function AdminDashboard() {
  const { t, locale } = useAdminTranslations();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const profileQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: adminService.getCurrentUser,
    staleTime: 10 * 60 * 1000,
  });
  const profile = profileQuery.data?.data ?? null;
  useEffect(() => {
    setUser(getAuthSession()?.user ?? null);
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  const modules = [
    {
      href: "/admin/users",
      title: t.users,
      description: t.userDescription,
      icon: <Users size={22} />,
    },
    {
      href: "/admin/roles",
      title: t.roles,
      description: t.roleDescription,
      icon: <ShieldCheck size={22} />,
    },
    {
      href: "/admin/permissions",
      title: t.permissions,
      description: t.permissionDescription,
      icon: <KeyRound size={22} />,
    },
  ];
  return (
    <section className="relative">
      <p className="text-[11px] font-bold tracking-[.18em] text-[#154a9b]">
        {t.administrator.toUpperCase()}
      </p>
      <h1 className="mt-2 text-[2rem] font-bold tracking-[-.035em] text-[#102a50]">
        {t.hello}, {user?.name ?? "—"}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66758a]">{t.dashboardDescription}</p>
      <div className="mt-5 rounded-2xl border border-[#dce4ef] bg-white px-4 py-3 shadow-[0_12px_28px_-24px_rgba(31,67,111,.4)] sm:absolute sm:right-0 sm:top-0 sm:mt-0 sm:text-right">
        <p className="font-mono text-xl font-semibold tracking-[-.03em] text-[#102a50]">
          {now?.toLocaleTimeString(dateLocale, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }) ?? "--:--:--"}
        </p>
        <p className="mt-1 text-xs font-medium capitalize text-[#718096]">
          {now?.toLocaleDateString(dateLocale, {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          }) ?? t.today}
        </p>
      </div>
      <div className="mt-8">
        <div className="relative overflow-hidden rounded-[26px] bg-[#154a9b] p-6 text-white shadow-[0_22px_46px_-28px_rgba(21,74,155,.65)]">
          <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full border-[28px] border-white/10" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-white/65">
                {t.yourAccess}
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-white">
                {profile?.permissions.length ?? 0}
              </p>
              <p className="mt-1 text-sm text-white/70">{t.permissionGranted}</p>
            </div>
            <span className="relative grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
              <KeyRound size={21} />
            </span>
          </div>
          <div className="relative mt-5 grid max-h-44 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {profile?.permissions.map((permission) => (
              <div
                key={permission.id}
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm leading-5 text-white/90"
              >
                {permission.description ?? permission.permission}
              </div>
            ))}
          </div>
        </div>
      </div>
      {user?.role === "ADMIN" ? (
        <div className="mt-9">
          <h2 className="text-lg font-bold tracking-tight text-[#102a50]">{t.quickAccess}</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_.85fr]">
            {modules.map((module, index) => (
              <Link
                key={module.href}
                href={module.href}
                className={`group rounded-[24px] border border-[#dce4ef] bg-white p-6 shadow-[0_16px_38px_-30px_rgba(31,67,111,.45)] transition duration-300 hover:-translate-y-1 hover:border-[#9db6d7] ${index === 0 ? "lg:row-span-2 lg:p-8" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf4fc] text-[#154a9b]">
                    {module.icon}
                  </span>
                  <ArrowUpRight
                    size={18}
                    className="text-[#8b9aae] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#154a9b]"
                  />
                </div>
                <h3
                  className={`${index === 0 ? "mt-10 text-2xl" : "mt-5 text-lg"} font-bold tracking-tight text-[#102a50]`}
                >
                  {module.title}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#66758a]">
                  {module.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
