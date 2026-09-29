import { Prisma, type Ranking } from "@prisma/client";

import {
  boundedTotalScore,
  cappedCriterionScore,
  rankingFor,
} from "@modules/conduct-score/services/conduct-score-calculation.service";
export async function recalculate(
  tx: Prisma.TransactionClient,
  conductScoreId: string,
): Promise<{ totalScore: number; ranking: Ranking }> {
  const grouped = await tx.conductScoreEntry.groupBy({
    by: ["criteriaId"],
    where: { conductScoreId },
    _sum: { points: true },
  });
  const criterionIds = grouped.flatMap((item) => (item.criteriaId ? [item.criteriaId] : []));
  const criteria = await tx.criteria.findMany({
    where: { id: { in: criterionIds } },
    select: { id: true, maxPoints: true },
  });
  const maximumById = new Map(criteria.map((item) => [item.id, item.maxPoints]));
  const criteriaTotals = grouped.flatMap((item) => {
    if (!item.criteriaId) return [];
    const rawScore = item._sum.points ?? 0;
    return [
      {
        conductScoreId,
        criteriaId: item.criteriaId,
        rawScore,
        cappedScore: cappedCriterionScore(rawScore, maximumById.get(item.criteriaId) ?? 0),
      },
    ];
  });
  await tx.conductScoreCriterionTotal.deleteMany({ where: { conductScoreId } });
  if (criteriaTotals.length)
    await tx.conductScoreCriterionTotal.createMany({ data: criteriaTotals });
  const uncategorized = grouped.find((item) => item.criteriaId === null)?._sum.points ?? 0;
  const totalScore = boundedTotalScore(
    uncategorized + criteriaTotals.reduce((sum, item) => sum + item.cappedScore, 0),
  );
  const ranking = rankingFor(totalScore);
  await tx.conductScore.update({ where: { id: conductScoreId }, data: { totalScore, ranking } });
  return { totalScore, ranking };
}

export async function addDefaultCriterionEntries(
  tx: Prisma.TransactionClient,
  conductScoreIds: string[],
  actorUserId: string,
): Promise<void> {
  if (!conductScoreIds.length) return;
  const scoreIds = Prisma.join(conductScoreIds.map((id) => Prisma.sql`${id}::uuid`));
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "conduct_score_entries" (
      "id", "conductScoreId", "criteriaId", "points", "result", "source",
      "reason", "createdByUserId", "idempotencyKey", "createdAt"
    )
    SELECT
      gen_random_uuid(),
      score."id",
      criterion."id",
      criterion."defaultPoints",
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM "conduct_score_entries" deduction
          WHERE deduction."conductScoreId" = score."id"
            AND deduction."criteriaId" = criterion."id"
            AND deduction."points" < 0
            AND deduction."source" <> 'DEFAULT_CRITERION'::"ConductScoreEntrySource"
        ) THEN 'DEFAULT_SCORE'
        ELSE 'NO_VIOLATION'
      END,
      'DEFAULT_CRITERION'::"ConductScoreEntrySource",
      criterion."title",
      ${actorUserId}::uuid,
      CONCAT('default:score:', score."id", ':criteria:', criterion."id"),
      CURRENT_TIMESTAMP
    FROM "conduct_scores" score
    CROSS JOIN "criteria" criterion
    WHERE score."id" IN (${scoreIds})
      AND criterion."defaultPoints" > 0
    ON CONFLICT ("idempotencyKey") DO NOTHING
  `);
}

export async function recalculateMany(
  tx: Prisma.TransactionClient,
  conductScoreIds: string[],
): Promise<void> {
  if (!conductScoreIds.length) return;
  await tx.conductScoreCriterionTotal.deleteMany({
    where: { conductScoreId: { in: conductScoreIds } },
  });
  const totalScoreIds = Prisma.join(conductScoreIds.map((id) => Prisma.sql`${id}::uuid`));
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "conduct_score_criterion_totals" (
      "id", "conductScoreId", "criteriaId", "rawScore", "cappedScore", "updatedAt"
    )
    SELECT
      gen_random_uuid(),
      entry."conductScoreId",
      entry."criteriaId",
      SUM(entry."points")::integer,
      LEAST(GREATEST(SUM(entry."points"), 0), criterion."maxPoints")::integer,
      CURRENT_TIMESTAMP
    FROM "conduct_score_entries" entry
    INNER JOIN "criteria" criterion ON criterion."id" = entry."criteriaId"
    WHERE entry."conductScoreId" IN (${totalScoreIds})
      AND entry."criteriaId" IS NOT NULL
    GROUP BY entry."conductScoreId", entry."criteriaId", criterion."maxPoints"
  `);
  const scoreIds = Prisma.join(conductScoreIds.map((id) => Prisma.sql`${id}::uuid`));
  await tx.$executeRaw(Prisma.sql`
    WITH calculated AS (
      SELECT
        score."id",
        LEAST(
          100,
          GREATEST(
            0,
            COALESCE((
              SELECT SUM(total."cappedScore")
              FROM "conduct_score_criterion_totals" total
              WHERE total."conductScoreId" = score."id"
            ), 0) + COALESCE((
              SELECT SUM(entry."points")
              FROM "conduct_score_entries" entry
              WHERE entry."conductScoreId" = score."id" AND entry."criteriaId" IS NULL
            ), 0)
          )
        )::integer AS "totalScore"
      FROM "conduct_scores" score
      WHERE score."id" IN (${scoreIds})
    )
    UPDATE "conduct_scores" score
    SET
      "totalScore" = calculated."totalScore",
      "ranking" = CASE
        WHEN calculated."totalScore" >= 90 THEN 'EXCELLENT'::"Ranking"
        WHEN calculated."totalScore" >= 80 THEN 'GOOD'::"Ranking"
        WHEN calculated."totalScore" >= 65 THEN 'FAIR'::"Ranking"
        WHEN calculated."totalScore" >= 50 THEN 'AVERAGE'::"Ranking"
        ELSE 'POOR'::"Ranking"
      END,
      "updatedAt" = CURRENT_TIMESTAMP
    FROM calculated
    WHERE score."id" = calculated."id"
  `);
}
