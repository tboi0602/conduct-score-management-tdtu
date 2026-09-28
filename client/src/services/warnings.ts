import { authHttp } from "@/services/http";

export type ConductScoreWarning = {
  id: string;
  observedScore: number;
  threshold: number;
  createdAt: string;
  semester: { id: string; type: "HK1" | "HK2" | "HK3"; year: number; endDate: string };
};

export const warningService = {
  mine: () =>
    authHttp<{ ok: true; data: ConductScoreWarning[] }>("/api/v1/warnings/me").then(
      (response) => response.data,
    ),
};
