import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import { UserRoleAssignments } from "@/components/admin/users/UserRoleAssignments";

export default function RoleAssignmentPage() {
  return (
    <AdminResourceAccess permission="faculty-staff.assign-event-organizer">
      <UserRoleAssignments />
    </AdminResourceAccess>
  );
}
