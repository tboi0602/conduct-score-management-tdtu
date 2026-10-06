import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import { ConductScoresManagement } from "@/components/admin/conduct-scores/ConductScoresManagement";

export default function ConductScoresPage() {
  return (
    <AdminResourceAccess permission="conduct-score.read">
      <ConductScoresManagement />
    </AdminResourceAccess>
  );
}
