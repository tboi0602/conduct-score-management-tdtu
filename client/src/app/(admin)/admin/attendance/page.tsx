import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import { AttendanceEvents } from "@/components/admin/attendance/AttendanceEvents";

export default function AttendancePage() {
  return (
    <AdminResourceAccess permission="attendance.read">
      <AttendanceEvents />
    </AdminResourceAccess>
  );
}
