import type { PaginationMeta } from "@/types/admin";
import type { Semester } from "@/types/events";

export type ConductScoreStatus = "DRAFT" | "FINAL";
export type ConductScoreRanking = "EXCELLENT" | "GOOD" | "FAIR" | "AVERAGE" | "POOR";
export type ConductScoreEntrySource = "EVENT" | "MANUAL_ADJUSTMENT" | "REVERSAL" | "LEGACY_IMPORT";

export type ConductScoreSummary = {
  id: string;
  studentId: string;
  semesterId: string;
  totalScore: number;
  ranking: ConductScoreRanking;
  status: ConductScoreStatus;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  criteriaTotals: Array<{
    rawScore: number;
    cappedScore: number;
    criteria: { id: string; title: string; maxPoints: number };
  }>;
};

export type ConductScoreStudent = {
  id: string;
  studentCode: string;
  major: string | null;
  user: { name: string; email: string };
  class: { id: string; code: string; name: string } | null;
};

export type ConductScoreListItem = {
  student: ConductScoreStudent;
  score: ConductScoreSummary | null;
};
export type ConductScoreDetail = {
  student: ConductScoreStudent;
  criteriaCatalog: Array<{ id: string; title: string; maxPoints: number }>;
  score:
    | (ConductScoreSummary & {
        semester: Pick<Semester, "id" | "year" | "type">;
        finalizedBy: { id: string; name: string } | null;
        entries: Array<{
          id: string;
          points: number;
          source: ConductScoreEntrySource;
          reason: string | null;
          createdAt: string;
          reversalOfId: string | null;
          criteria: { id: string; title: string; maxPoints: number } | null;
          event: { id: string; name: string } | null;
          createdBy: { id: string; name: string } | null;
        }>;
        statusHistory: Array<{
          id: string;
          action: "FINALIZED" | "REOPENED";
          reason: string | null;
          createdAt: string;
          actor: { id: string; name: string } | null;
        }>;
      })
    | null;
};

export type ConductScoreFilters = {
  semesterId: string;
  search?: string;
  facultyId?: string;
  majorId?: string;
  classId?: string;
  status?: ConductScoreStatus;
  ranking?: ConductScoreRanking;
};

export type ConductScoreListResponse = {
  ok: true;
  data: ConductScoreListItem[];
  pagination: PaginationMeta;
};

export type BulkFinalizeResult = {
  matched: number;
  finalized: number;
  alreadyFinal: number;
};
