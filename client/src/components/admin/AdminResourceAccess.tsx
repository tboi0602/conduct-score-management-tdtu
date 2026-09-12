"use client";

import type { ReactNode } from "react";
import { useAdminAccess } from "@/hooks/auth/useAdminAccess";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { ManagementError } from "@/components/admin/ManagementFeedback";

export function AdminResourceAccess({
  permission,
  children,
}: {
  permission: string;
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
  if (!access.can(permission))
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
