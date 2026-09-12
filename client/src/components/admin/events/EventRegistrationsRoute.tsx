"use client";

import { EventRegistrations } from "@/components/admin/events/EventRegistrations";
import { ManagementError } from "@/components/admin/ManagementFeedback";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useEventDetail } from "@/hooks/events/useEventManagement";

export function EventRegistrationsRoute({ eventId }: { eventId: string }) {
  const { t } = useAdminTranslations();
  const query = useEventDetail(eventId);
  if (query.isPending) return <PageLoadingSkeleton />;
  if (query.error || !query.data) {
    return (
      <ManagementError
        error={query.error}
        fallback={t.loadError}
        retry={() => void query.refetch()}
      />
    );
  }
  return <EventRegistrations event={query.data} />;
}
