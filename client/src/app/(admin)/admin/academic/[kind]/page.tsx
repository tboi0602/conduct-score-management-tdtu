import { notFound } from "next/navigation";
import { AcademicManagement } from "@/components/admin/academic/AcademicManagement";
import { AdminResourceAccess } from "@/components/admin/AdminResourceAccess";
import type { AcademicKind } from "@/types/admin";
export default function AcademicPage({ params }: { params: { kind: string } }) {
  if (!(["faculties", "majors", "classes"] as string[]).includes(params.kind)) notFound();
  return (
    <AdminResourceAccess permission="academic.read">
      <AcademicManagement kind={params.kind as AcademicKind} />
    </AdminResourceAccess>
  );
}
