import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import { EventRegistrationsRoute } from "@/components/admin/events/EventRegistrationsRoute";

export default function EventRegistrationsPage({ params }: { params: { id: string } }) {
  return (
    <AdminResourceAccess permission="event-registration.manage">
      <EventRegistrationsRoute eventId={params.id} />
    </AdminResourceAccess>
  );
}
