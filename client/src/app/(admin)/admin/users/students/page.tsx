import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import { UsersManagement } from "@/components/admin/users/UsersManagement";

export default function StudentsPage() {
  return (
    <AdminResourceAccess permission="student.read">
      <UsersManagement mode="STUDENT" />
    </AdminResourceAccess>
  );
}
