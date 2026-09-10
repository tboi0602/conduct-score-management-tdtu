import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import { SemestersManagement } from "@/components/admin/semesters/SemestersManagement";

export default function SemestersPage() {
  return (
    <AdminResourceAccess permission="semester.read">
      <SemestersManagement />
    </AdminResourceAccess>
  );
}
