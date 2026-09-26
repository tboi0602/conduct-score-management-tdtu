export type AppealTarget = "CHECK_IN" | "CHECK_OUT" | "BOTH";
export type AppealStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AppealEvent = {
  id: string;
  name: string;
  timeStart: string;
  timeEnd: string;
  checkInMode: "ONE_WAY" | "TWO_WAY";
  points: number;
  organizer: { id: string; name: string | null; code: string } | null;
};

export type AttendanceAppeal = {
  id: string;
  attemptNumber: number;
  target: AppealTarget | null;
  failureCategory: import("@/types/attendance-failure").AttendanceFailureCategory | null;
  failedAt: string | null;
  status: AppealStatus;
  explanation: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  evidenceName: string;
  evidenceMime: string;
  evidenceSize: number;
  createdAt: string;
  event: AppealEvent;
  student: { id: string; studentCode: string; user: { name: string; email: string } };
  reviewedBy: { id: string; name: string } | null;
};

export type EvidenceUpload = {
  url: string;
  fields: Record<string, string>;
  key: string;
  maxBytes: number;
};
