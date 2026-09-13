import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import { OrganizersManagement } from "@/components/admin/organizers/OrganizersManagement";
export default function OrganizersPage() {
  return (
    <AdminResourceAccess permission="organizer.read">
      <OrganizersManagement />
    </AdminResourceAccess>
  );
}
