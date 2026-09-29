import { Prisma } from "@prisma/client";
export const scoreSelect = {
  id: true,
  studentId: true,
  semesterId: true,
  totalScore: true,
  ranking: true,
  status: true,
  finalizedAt: true,
  createdAt: true,
  updatedAt: true,
  criteriaTotals: {
    select: {
      rawScore: true,
      cappedScore: true,
      criteria: { select: { id: true, title: true, maxPoints: true, defaultPoints: true } },
    },
    orderBy: { criteria: { title: "asc" as const } },
  },
} satisfies Prisma.ConductScoreSelect;
