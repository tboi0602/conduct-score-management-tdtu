import type { CheckInMode, ManagedEvent } from "@/types/events";

export type AttendanceDirection = "CHECK_IN" | "CHECK_OUT";
export type AttendanceScanStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type AttendanceSource =
  "STUDENT_QR" | "STAFF_BARCODE" | "MANUAL_ENTRY" | "BULK_IMPORT" | "REGISTERED";
export type AttendanceImportResult = {
  requested: number;
  queued: number;
  duplicateCodes: string[];
  notFoundCodes: string[];
};
export type AttendanceReconciliationState = "MATCHED" | "CLIENT_ONLY" | "SERVER_ONLY" | "RESOLVED";
export type AttendanceReconciliationRow = {
  incidentId: string | null;
  auditId: string | null;
  clientAttemptId: string;
  studentCode: string | null;
  studentName: string | null;
  failureCategory: string | null;
  failedAt: string | null;
  digest: string | null;
  incidentStatus: "OPEN" | "RESOLVED" | null;
  resolutionNote: string | null;
  requestId: string | null;
  httpStatus: number | null;
  durationMs: number | null;
  instance: string | null;
  scanStatus: AttendanceScanStatus | null;
  rejectionReason: string | null;
  attendanceStatus: "ATTENDED" | "LATE" | "ABSENT" | null;
};
export type AttendanceSession = {
  id: string;
  eventId: string;
  direction: AttendanceDirection;
  status: "OPEN" | "CLOSED";
  radiusMeters: number;
  openedAt: string;
  closedAt: string | null;
};
export type StudentAttendanceAttempt = {
  found: boolean;
  request: {
    id: string;
    status: AttendanceScanStatus;
    rejectionReason: string | null;
    processedAt: string | null;
    direction: AttendanceDirection;
    event: { id: string; name: string; timeEnd: string };
  } | null;
};
export type AttendanceQr = {
  token: string;
  scanUrl: string;
  expiresAt: string;
  session: AttendanceSession;
  eventStart: string;
};
export type AttendanceRequest = {
  id: string;
  direction: AttendanceDirection;
  source: AttendanceSource;
  requestedStatus: "ATTENDED" | "LATE";
  status: AttendanceScanStatus;
  rejectionReason: string | null;
  processedAt: string | null;
  createdAt: string;
  student: { id: string; studentCode: string; user: { name: string; email: string } };
  attendanceRecord: { id: string; status: "ATTENDED" | "LATE" | "ABSENT" } | null;
  isRegistrationOnly?: boolean;
};
export type AttendanceEvent = ManagedEvent & { checkInMode: CheckInMode };
export type DashboardSummary = {
  scope: "GLOBAL" | "FACULTY";
  facultyId: string | null;
  semester: { id: string; year: number; type: "HK1" | "HK2" | "HK3" };
  totals: {
    students: number;
    faculties: number;
    classes: number;
    staff: number;
    events: { upcoming: number; ongoing: number; completed: number; total: number };
    registrations: number;
    attendanceRecords: number;
    absences: number;
    attendanceRate: number;
    averageScore: number;
    atRisk: number;
    draftScores: number;
    finalScores: number;
  };
  trend: Array<{ label: string; registrations: number; attendance: number }>;
  attendance: { attended: number; late: number; absent: number };
  rankings: Array<{ name: string; value: number }>;
  comparison: Array<{
    id: string;
    code: string;
    name: string;
    students: number;
    averageScore: number;
  }>;
  topEvents: Array<{
    id: string;
    name: string;
    capacity: number | null;
    registrations: number;
    attendance: number;
  }>;
  faculties?: Array<{
    id: string;
    code: string;
    name: string;
    students: number;
    events: number;
    registrations: number;
    attendanceRecords: number;
    absences: number;
    attendanceRate: number;
  }>;
};
