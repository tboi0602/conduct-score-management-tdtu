"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clearAuthSession, getAuthSession } from "@/lib/auth-storage";
import type { AuthUser } from "@/types/auth";

export function useAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [authorizationOpen, setAuthorizationOpen] = useState(true);
  const [academicOpen, setAcademicOpen] = useState(true);
  const [eventOpen, setEventOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const session = getAuthSession();
    if (!session) return router.replace("/admin");
    if (session.user.role === "STUDENT") return router.replace("/dashboard");
    setUser(session.user);
    setCollapsed(window.localStorage.getItem("admin.sidebar.collapsed") === "true");
  }, [router]);
  useEffect(() => setMobileOpen(false), [pathname]);
  const toggleCollapsed = () =>
    setCollapsed((value) => {
      window.localStorage.setItem("admin.sidebar.collapsed", String(!value));
      return !value;
    });
  const signOut = () => {
    queryClient.clear();
    clearAuthSession();
    router.replace("/admin");
  };
  return {
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
  };
}
