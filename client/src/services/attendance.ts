import { authHttp } from "@/services/http";
import type { PaginatedResponse } from "@/types/admin";
import type {
  AttendanceDirection,
  AttendanceQr,
  AttendanceRequest,
  AttendanceScanStatus,
  AttendanceSession,
  DashboardSummary,
} from "@/types/attendance";

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
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  }) =>
    authHttp<{ ok: true; data: { requestId: string; status: "PENDING" } }>(
      "/api/v1/attendance/scan/qr",
      json("POST", payload),
    ),
  myRequest: (requestId: string) =>
    authHttp<{
      ok: true;
      data: { id: string; status: AttendanceScanStatus; rejectionReason: string | null };
    }>(`/api/v1/attendance/requests/${requestId}`),
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
