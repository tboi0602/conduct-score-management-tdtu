import { authHttp } from "@/services/http";
import type { PaginatedResponse } from "@/types/admin";
import type {
  AttendanceDirection,
  AttendanceQr,
  AttendanceRequest,
  AttendanceScanStatus,
  AttendanceSession,
  StudentAttendanceAttempt,
  DashboardSummary,
  AttendanceImportResult,
  AttendanceReconciliationRow,
} from "@/types/attendance";
import type { AttendanceIncidentPayload } from "@/types/attendance-failure";

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const attendanceService = {
  activeSession: (eventId: string) =>
    authHttp<{ ok: true; data: AttendanceSession | null }>(
      `/api/v1/attendance/events/${eventId}/session`,
    ),
  openSession: (
    eventId: string,
    payload: {
      direction: AttendanceDirection;
      latitude: number;
      longitude: number;
      accuracyMeters: number;
    },
  ) =>
    authHttp<{ ok: true; data: AttendanceSession }>(
      `/api/v1/attendance/events/${eventId}/session`,
      json("POST", payload),
    ),
  closeSession: (eventId: string) =>
    authHttp<{ ok: true; data: AttendanceSession }>(
      `/api/v1/attendance/events/${eventId}/session`,
      { method: "DELETE" },
    ),
  qr: (eventId: string) =>
    authHttp<{ ok: true; data: AttendanceQr }>(`/api/v1/attendance/events/${eventId}/qr`),
  scanManaged: (
    eventId: string,
    payload: {
      studentCode: string;
      direction: AttendanceDirection;
      source: "STAFF_BARCODE" | "MANUAL_ENTRY";
      status: "ATTENDED" | "LATE";
    },
  ) =>
    authHttp<{ ok: true; data: { requestId: string; status: "PENDING" } }>(
      `/api/v1/attendance/events/${eventId}/scan`,
      json("POST", payload),
    ),
  importAttendance: (
    eventId: string,
    payload: {
      studentCodes: string[];
      direction: AttendanceDirection;
      status: "ATTENDED" | "LATE";
    },
  ) =>
    authHttp<{ ok: true; data: AttendanceImportResult }>(
      `/api/v1/attendance/events/${eventId}/import`,
      json("POST", payload),
    ),
  requests: (eventId: string, page: number, search = "", status = "") => {
    const query = new URLSearchParams({ page: String(page), limit: "20", search, status });
    return authHttp<PaginatedResponse<AttendanceRequest>>(
      `/api/v1/attendance/events/${eventId}/requests?${query}`,
    );
  },
  adjustStatus: (eventId: string, recordId: string, status: "ATTENDED" | "LATE" | "ABSENT") =>
    authHttp<{ ok: true; data: { id: string; status: "ATTENDED" | "LATE" | "ABSENT" } }>(
      `/api/v1/attendance/events/${eventId}/records/${recordId}`,
      json("PATCH", { status }),
    ),
  studentQr: (payload: {
    token: string;
    clientAttemptId: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  }) =>
    authHttp<{
      ok: true;
      data: {
        requestId: string;
        status: AttendanceScanStatus;
        direction: AttendanceDirection;
        event: { id: string; name: string; timeEnd: string };
      };
    }>("/api/v1/attendance/scan/qr", {
      ...json("POST", payload),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Attempt-ID": payload.clientAttemptId,
      },
    }),
  submitIncident: (payload: AttendanceIncidentPayload, digest: string) =>
    authHttp<{
      ok: true;
      data: { id: string; clientAttemptId: string; status: "OPEN" | "RESOLVED" };
    }>("/api/v1/attendance/incidents", json("POST", { ...payload, digest })),
  reconciliation: (eventId: string, page: number, search = "", state = "") => {
    const query = new URLSearchParams({ page: String(page), limit: "20", search, state });
    return authHttp<PaginatedResponse<AttendanceReconciliationRow>>(
      `/api/v1/attendance/events/${eventId}/reconciliation?${query}`,
    );
  },
  resolveIncident: (eventId: string, incidentId: string, note: string) =>
    authHttp<{ ok: true; data: { id: string; status: "RESOLVED"; resolutionNote: string } }>(
      `/api/v1/attendance/events/${eventId}/reconciliation/${incidentId}`,
      json("PATCH", { note }),
    ),
  myRequest: (requestId: string) =>
    authHttp<{
      ok: true;
      data: { id: string; status: AttendanceScanStatus; rejectionReason: string | null };
    }>(`/api/v1/attendance/requests/${requestId}`),
  myAttempt: (clientAttemptId: string) =>
    authHttp<{ ok: true; data: StudentAttendanceAttempt }>(
      `/api/v1/attendance/me/attempts/${clientAttemptId}`,
    ),
  studentTicket: () =>
    authHttp<{ ok: true; data: { ticket: string; expiresInSeconds: number } }>(
      "/api/v1/attendance/me/sse-ticket",
      { method: "POST" },
    ),
  eventTicket: (eventId: string) =>
    authHttp<{ ok: true; data: { ticket: string; expiresInSeconds: number } }>(
      `/api/v1/attendance/events/${eventId}/sse-ticket`,
      { method: "POST" },
    ),
  dashboard: (semesterId?: string) =>
    authHttp<{ ok: true; data: DashboardSummary }>(
      `/api/v1/dashboard${semesterId ? `?semesterId=${semesterId}` : ""}`,
    ),
};
