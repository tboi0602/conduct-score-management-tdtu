import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import { AdminAppeals } from "@/components/admin/appeals/AdminAppeals";

export default function AdminAppealsPage() {
  return (
    <AdminResourceAccess permission="appeal.read">
      <AdminAppeals />
    </AdminResourceAccess>
  );
}
