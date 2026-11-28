"use client";

import { useMemo } from "react";
import { Ban, Pencil } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { useColumns, type ColumnDef } from "@/hooks/ui/useColumns";
import type { AdminUser } from "@/types/admin";

interface UseUserColumnsOptions {
  mode?: "STUDENT" | "STAFF";
  page: number;
  currentUserId?: string;
  t: Record<string, string>;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

export function useUserColumns({
  mode,
  page,
  currentUserId,
  t,
  onEdit,
  onDelete,
}: UseUserColumnsOptions) {
  const columnDefs = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        key: "ordinal",
        title: "#",
        width: 56,
        align: "center",
        render: (_user, index) => (
          <span className="tabular-nums text-[#66758a]">{(page - 1) * 50 + index + 1}</span>
        ),
      },
      {
        key: "studentCode",
        title: t.studentCode,
        width: 130,
        render: (user) => (
          <span className="font-mono text-xs font-semibold text-[#154a9b]">
            {user.student?.studentCode ?? "—"}
          </span>
        ),
      },
      {
        key: "fullName",
        title: t.fullName,
        width: 200,
        render: (user) => <span className="font-semibold text-[#102a50]">{user.name}</span>,
      },
      {
        key: "email",
        title: t.email,
        width: 220,
        render: (user) => <span className="text-[#52647d]">{user.email}</span>,
      },
      {
        key: "faculty",
        title: t.faculty,
        width: 220,
        render: (user) => (
          <span className="text-[#52647d]">
            {user.student?.class?.major?.faculty?.name ?? user.primaryFaculty?.name ?? "—"}
          </span>
        ),
      },
      {
        key: "major",
        title: t.major,
        width: 200,
        render: (user) => (
          <span className="text-[#52647d]">{user.student?.class?.major?.name ?? "—"}</span>
        ),
      },
      {
        key: "class",
        title: t.class,
        width: 180,
        render: (user) => (
          <span className="text-[#263b58]">{user.student?.class?.name ?? "—"}</span>
        ),
      },
      {
        key: "roles",
        title: t.roles,
        width: 200,
        render: (user) => (
          <div className="flex flex-nowrap items-center gap-1">
            {user.userRoles.map(({ role }) => (
              <span
                key={role.id}
                className="rounded bg-[#edf4fc] px-2 py-0.5 text-[11px] font-semibold text-[#154a9b]"
              >
                {role.displayName || role.code}
              </span>
            ))}
          </div>
        ),
      },
      {
        key: "status",
        title: t.status,
        width: 120,
        align: "center",
        render: (user) => (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              user.status === "ACTIVE"
                ? "bg-[#eaf7ef] text-[#1f7a44]"
                : "bg-[#fff1f2] text-[#b72e3f]"
            }`}
          >
            {user.status === "ACTIVE" ? t.active : t.disabled}
          </span>
        ),
      },
      {
        key: "actions",
        title: t.actions,
        width: 96,
        align: "center",
        sticky: "right",
        render: (user) => (
          <div className="flex justify-center gap-1">
            {user.status !== "DISABLED" ? (
              <IconButton
                label={t.edit}
                tone="brand"
                className="!h-7 !w-7 !rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(user);
                }}
              >
                <Pencil size={13} />
              </IconButton>
            ) : null}
            {user.email !== "admin" && user.id !== currentUserId && user.status !== "DISABLED" ? (
              <IconButton
                label={t.disable}
                tone="danger"
                className="!h-7 !w-7 !rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(user);
                }}
              >
                <Ban size={13} />
              </IconButton>
            ) : null}
          </div>
        ),
      },
    ],
    [currentUserId, onDelete, onEdit, page, t],
  );

  return useColumns(columnDefs, `ops.columns.users.${mode ?? "all"}`);
}
