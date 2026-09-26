"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { StudentCheckIn } from "@/components/student/StudentCheckIn";

function CheckInContent() {
  const search = useSearchParams();
  const direction = search.get("direction");
  return (
    <StudentCheckIn
      token={search.get("token") ?? ""}
      eventId={search.get("eventId") ?? ""}
      eventName={search.get("eventName") ?? ""}
      eventEnd={search.get("eventEnd") ?? ""}
      direction={direction === "CHECK_IN" || direction === "CHECK_OUT" ? direction : null}
    />
  );
}

export default function StudentCheckInPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <CheckInContent />
    </Suspense>
  );
}
