"use client";

import type { ReactNode } from "react";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { ManagementError } from "@/components/admin/ManagementFeedback";
import type { AppRole } from "@/types/auth";

export function AdminResourceAccess({
  permission,
  allowedRoles,
  children,
}: {
  permission: string;
  allowedRoles?: AppRole[];
  children: ReactNode;
}) {
  const access = useAdminAccess();
  const { t } = useAdminTranslations();
  if (access.isLoading) return <PageLoadingSkeleton />;
  if (access.error)
    return (
      <ManagementError
        error={access.error}
        fallback={t.loadError}
        retry={() => void access.retry()}
      />
    );
  const hasAllowedRole =
    !allowedRoles ||
    access.profile?.roles.some((role) =>
      allowedRoles.some((allowedRole) => allowedRole === role.name),
    );
  if (!access.can(permission) || !hasAllowedRole)
    return (
      <p
        role="alert"
        className="rounded-xl border border-[#dce4ef] bg-white p-6 text-sm text-[#52647d]"
      >
        {t.accessDenied}
      </p>
    );
  return children;
}
