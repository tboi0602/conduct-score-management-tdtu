"use client";

import { useQuery } from "@tanstack/react-query";
import { EventRegistrations } from "@/components/admin/events/EventRegistrations";
import { ManagementError } from "@/components/admin/ManagementFeedback";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";
import { queryKeys } from "@/lib/query-keys";
import { eventService } from "@/services/events";

export function EventRegistrationsRoute({ eventId }: { eventId: string }) {
  const { t } = useAdminTranslations();
  const query = useQuery({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => eventService.get(eventId).then((response) => response.data),
    staleTime: 60_000,
  });
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
