import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import { EventsManagement } from "@/components/admin/events/EventsManagement";

export default function EventsPage() {
  return (
    <AdminResourceAccess permission="event.read">
      <EventsManagement />
    </AdminResourceAccess>
  );
}
