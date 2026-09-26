export type AttendanceFailureCategory =
  | "NETWORK_ERROR"
  | "QR_ERROR"
  | "SESSION_EXPIRED"
  | "TIMEOUT"
  | "LOCATION_ERROR"
  | "SERVICE_ERROR"
  | "OTHER";

export type AttendanceFailureDraftStatus = "UNSENT" | "CHECKING" | "PENDING" | "FAILED";

export type AttendanceFailureDraft = {
  clientAttemptId: string;
  userId: string;
  eventId: string;
  eventName: string;
  eventEnd: string;
  direction: "CHECK_IN" | "CHECK_OUT" | null;
  failedAt: string;
  requestId: string | null;
  failureCategory: AttendanceFailureCategory;
  status: AttendanceFailureDraftStatus;
  notifiedAt?: string;
};
