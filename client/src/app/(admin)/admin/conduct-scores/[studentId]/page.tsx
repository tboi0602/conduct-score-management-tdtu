import { ConductScoreDetails } from "@/components/admin/conduct-scores/ConductScoreDetails";

export default function ConductScoreDetailPage({
  params,
  searchParams,
}: {
  params: { studentId: string };
  searchParams: { semesterId?: string };
}) {
  return (
    <ConductScoreDetails studentId={params.studentId} semesterId={searchParams.semesterId ?? ""} />
  );
}
