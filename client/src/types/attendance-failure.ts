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
  retryExpiresAt?: string;
  retryPayload?: {
    token: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  };
  tokenFingerprint?: string | null;
  digest?: string;
  syncedAt?: string;
};

export type AttendanceIncidentPayload = {
  clientAttemptId: string;
  eventId: string;
  direction: "CHECK_IN" | "CHECK_OUT" | null;
  failureCategory: AttendanceFailureCategory;
  failedAt: string;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  tokenFingerprint: string | null;
  clientOnline: boolean;
  userAgent: string | null;
};
