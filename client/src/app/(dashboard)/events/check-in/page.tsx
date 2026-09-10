"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { StudentCheckIn } from "@/components/student/StudentCheckIn";

function CheckInContent() {
  const search = useSearchParams();
  return <StudentCheckIn token={search.get("token") ?? ""} />;
}

export default function StudentCheckInPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <CheckInContent />
    </Suspense>
  );
}
