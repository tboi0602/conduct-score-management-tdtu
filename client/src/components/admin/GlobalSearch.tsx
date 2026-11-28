"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { permissionGroupLabels } from "@/i18n/admin-messages";

interface NavTarget {
  href: string;
  label: string;
  permission: string;
}

export function GlobalSearch({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const { can } = useAdminAccess();
  const { t, locale } = useAdminTranslations();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pages = useMemo<NavTarget[]>(
    () =>
      [
        { href: "/admin/dashboard", label: t.dashboard, permission: "dashboard.read" },
        { href: "/admin/events", label: t.events, permission: "event.read" },
        { href: "/admin/criteria", label: t.criteria, permission: "criteria.read" },
        { href: "/admin/semesters", label: t.semesterTitle, permission: "semester.read" },
        { href: "/admin/academic/faculties", label: t.academic, permission: "academic.read" },
        { href: "/admin/academic/majors", label: t.major, permission: "academic.read" },
        { href: "/admin/academic/classes", label: t.class, permission: "academic.read" },
        { href: "/admin/attendance", label: t.attendance, permission: "attendance.read" },
        {
          href: "/admin/conduct-scores",
          label: permissionGroupLabels[locale]["conduct-score"],
          permission: "conduct-score.read",
        },
        {
          href: "/admin/appeals",
          label: permissionGroupLabels[locale].appeal,
          permission: "appeal.read",
        },
        { href: "/admin/users", label: t.users, permission: "user.read" },
        { href: "/admin/roles", label: t.roles, permission: "role.read" },
        { href: "/admin/permissions", label: t.permissions, permission: "permission.read" },
      ].filter((item) => can(item.permission)),
    [can, t],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages.slice(0, 6);
    return pages.filter((item) => item.label.toLowerCase().includes(q));
  }, [pages, query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (collapsed) return null;

  return (
    <div className="relative px-1 pb-3">
      <div className="relative flex h-9 items-center rounded-lg border border-white/20 bg-white/10 px-3 text-white transition focus-within:border-white/40 focus-within:bg-white/15">
        <Search size={15} className="shrink-0 text-white/80" />
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) {
              router.push(matches[0].href);
              setOpen(false);
              setQuery("");
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={t.globalSearchPlaceholder}
          className="ml-2 w-full bg-transparent text-xs text-white placeholder:text-white/75 outline-none"
        />
        <kbd className="ml-2 shrink-0 rounded border border-white/25 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/90">
          Ctrl K
        </kbd>
      </div>
      {open && matches.length > 0 ? (
        <div className="absolute left-3 right-3 top-9 z-40 max-h-64 overflow-y-auto rounded-xl border border-[#dce4ef] bg-white p-1.5 shadow-xl">
          {matches.map((item) => (
            <button
              key={item.href}
              type="button"
              onMouseDown={() => {
                router.push(item.href);
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[#263b58] hover:bg-[#edf4fc] hover:text-[#154a9b]"
            >
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
