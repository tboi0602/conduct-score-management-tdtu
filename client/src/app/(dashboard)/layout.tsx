import { StudentShell } from "@/components/student/StudentShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
