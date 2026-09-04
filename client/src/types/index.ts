export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  className: string;
  faculty: string;
  status: "ACTIVE" | "GRADUATED" | "SUSPENDED" | "DROPPED_OUT";
  currentScore: number;
}

export interface Event {
  id: string;
  code: string;
  name: string;
  locationName: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  startAt: string;
  endAt: string;
  status: EventStatus;
}

export type EventStatus = "DRAFT" | "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";

export interface AttendanceLog {
  id: string;
  eventId: string;
  studentId: string;
  status: AttendanceStatus;
  scannedAt: string;
  gpsVerified: boolean;
  student?: Student;
  event?: Event;
}

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED" | "FAILED_GPS";

export interface Warning {
  id: string;
  studentId: string;
  ruleCode: string;
  severity: WarningSeverity;
  reason: string;
  action: string;
  resolvedAt: string | null;
  createdAt: string;
}

export type WarningSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { total: number; page: number; limit: number };
}

export interface ScanPayload {
  studentCode: string;
  eventCode: string;
  scanCode: string;
  lat: number;
  lng: number;
}