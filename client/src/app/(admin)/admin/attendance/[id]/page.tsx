import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import { AttendanceWorkspace } from "@/components/admin/attendance/AttendanceWorkspace";

export default function AttendanceEventPage({ params }: { params: { id: string } }) {
  return (
    <AdminResourceAccess permission="attendance.read">
      <AttendanceWorkspace eventId={params.id} />
    </AdminResourceAccess>
  );
}
