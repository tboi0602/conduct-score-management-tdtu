import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import { CriteriaManagement } from "@/components/admin/criteria/CriteriaManagement";

export default function CriteriaPage() {
  return (
    <AdminResourceAccess permission="criteria.read">
      <CriteriaManagement />
    </AdminResourceAccess>
  );
}
