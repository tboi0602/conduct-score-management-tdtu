import type { Ranking } from "@prisma/client";

export function rankingFor(score: number): Ranking {
  if (score >= 90) return "EXCELLENT";
  if (score >= 80) return "GOOD";
  if (score >= 65) return "FAIR";
  if (score >= 50) return "AVERAGE";
  return "POOR";
}

export function cappedCriterionScore(rawScore: number, maximum: number): number {
  return Math.min(Math.max(rawScore, 0), maximum);
}

export function boundedTotalScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}
