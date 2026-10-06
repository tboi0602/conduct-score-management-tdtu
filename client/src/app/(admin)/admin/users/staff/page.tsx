import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import { UsersManagement } from "@/components/admin/users/UsersManagement";

export default function StaffPage() {
  return (
    <AdminResourceAccess permission="faculty-staff.read">
      <UsersManagement mode="STAFF" />
    </AdminResourceAccess>
  );
}
