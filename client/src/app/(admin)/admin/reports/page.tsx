import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import { ReportsManagement } from "@/components/admin/reports/ReportsManagement";

export default function ReportsPage() {
  return (
    <AdminResourceAccess permission="dashboard.read">
      <ReportsManagement />
    </AdminResourceAccess>
  );
}
