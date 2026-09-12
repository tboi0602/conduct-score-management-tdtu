import { authHttp } from "@/services/http";
import type {
  ConductScoreDetail,
  ConductScoreFilters,
  ConductScoreListResponse,
  ConductScoreSummary,
  BulkFinalizeResult,
  BulkConductScoreAdjustmentPayload,
  BulkConductScoreAdjustmentResult,
} from "@/types/conduct-score";

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const conductScoreService = {
  list(page: number, limit: number, filters: ConductScoreFilters) {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    Object.entries(filters).forEach(([key, value]) => value && query.set(key, value));
    return authHttp<ConductScoreListResponse>(`/api/v1/conduct-scores?${query}`);
  },
  detail: (studentId: string, semesterId: string) =>
    authHttp<{ ok: true; data: ConductScoreDetail }>(
      `/api/v1/conduct-scores/${studentId}?semesterId=${semesterId}`,
    ),
  mine: (semesterId: string) =>
    authHttp<{ ok: true; data: ConductScoreDetail }>(
      `/api/v1/conduct-scores/me?semesterId=${semesterId}`,
    ),
  adjust: (
    studentId: string,
    payload: {
      semesterId: string;
      criteriaId: string;
      points: number;
      reason: string;
      result: string;
    },
  ) =>
    authHttp<{ ok: true; data: ConductScoreSummary }>(
      `/api/v1/conduct-scores/${studentId}/adjustments`,
      json(payload),
    ),
  bulkAdjust: (payload: BulkConductScoreAdjustmentPayload) =>
    authHttp<{ ok: true; data: BulkConductScoreAdjustmentResult }>(
      "/api/v1/conduct-scores/adjustments-bulk",
      json(payload),
    ),
  finalize: (studentId: string, semesterId: string) =>
    authHttp<{ ok: true; data: ConductScoreSummary }>(
      `/api/v1/conduct-scores/${studentId}/finalize`,
      json({ semesterId }),
    ),
  bulkFinalize: (payload: {
    semesterId: string;
    filters: Omit<ConductScoreFilters, "semesterId">;
    studentIds?: string[];
  }) =>
    authHttp<{ ok: true; data: BulkFinalizeResult }>(
      "/api/v1/conduct-scores/finalize-bulk",
      json(payload),
    ),
  reopen: (studentId: string, semesterId: string, reason: string) =>
    authHttp<{ ok: true; data: ConductScoreSummary }>(
      `/api/v1/conduct-scores/${studentId}/reopen`,
      json({ semesterId, reason }),
    ),
};
