import { authHttp } from "@/services/http";
import type { PaginatedResponse } from "@/types/admin";
import type { AppealEvent, AppealStatus, AttendanceAppeal, EvidenceUpload } from "@/types/appeal";

const json = { "Content-Type": "application/json" };
export const appealService = {
  eligible: () => authHttp<{ ok: true; data: AppealEvent[] }>("/api/v1/appeals/me/events"),
  upload: (mime: string) =>
    authHttp<{ ok: true; data: EvidenceUpload }>("/api/v1/appeals/me/upload", {
      method: "POST",
      headers: json,
      body: JSON.stringify({ mime }),
    }),
  uploadEvidenceFile: async (upload: EvidenceUpload, file: File) => {
    const form = new FormData();
    Object.entries(upload.fields).forEach(([key, value]) => form.append(key, value));
    form.append("file", file);
    const response = await fetch(upload.url, { method: "POST", body: form });
    if (!response.ok) throw new Error("EVIDENCE_UPLOAD_FAILED");
  },
  create: (payload: {
    eventId: string;
    explanation: string;
    failureCategory?: import("@/types/attendance-failure").AttendanceFailureCategory;
    failedAt?: string;
    evidenceKey: string;
    evidenceName: string;
    evidenceMime: string;
    evidenceSize: number;
  }) =>
    authHttp<{ ok: true; data: AttendanceAppeal }>("/api/v1/appeals/me", {
      method: "POST",
      headers: json,
      body: JSON.stringify(payload),
    }),
  mine: () => authHttp<PaginatedResponse<AttendanceAppeal>>("/api/v1/appeals/me?page=1&limit=50"),
  list: (status: AppealStatus | "" = "", search = "") => {
    const query = new URLSearchParams({ page: "1", limit: "100" });
    if (status) query.set("status", status);
    if (search.trim().length >= 3) query.set("search", search.trim());
    return authHttp<PaginatedResponse<AttendanceAppeal>>(`/api/v1/appeals?${query}`);
  },
  evidence: (id: string, own: boolean) =>
    authHttp<{ ok: true; data: { url: string } }>(
      `/api/v1/appeals/${own ? `me/${id}` : id}/evidence`,
    ),
  review: (id: string, decision: "APPROVED" | "REJECTED", reviewNote?: string) =>
    authHttp<{ ok: true; data: AttendanceAppeal }>(`/api/v1/appeals/${id}/review`, {
      method: "PATCH",
      headers: json,
      body: JSON.stringify({ decision, reviewNote }),
    }),
};
