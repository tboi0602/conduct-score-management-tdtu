import { createHash, randomUUID } from "crypto";
import { Prisma, type Ranking } from "@prisma/client";

import { prisma } from "@config/prisma";
import { invalidateDashboardCache } from "@services/dashboard/dashboard.service";
import { getEventAccess } from "@services/events/event-access.service";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";

export type ConductScoreFilters = {
  semesterId: string;
  search?: string;
  facultyId?: string;
  majorId?: string;
  classId?: string;
  status?: "DRAFT" | "FINAL";
  ranking?: Ranking;
};

const BULK_FINALIZE_LIMIT = 10_000;
const BULK_ADJUSTMENT_LIMIT = 5_000;

const rankingFor = (score: number): Ranking => {
  if (score >= 90) return "EXCELLENT";
  if (score >= 80) return "GOOD";
  if (score >= 65) return "FAIR";
  if (score >= 50) return "AVERAGE";
  return "POOR";
};

async function facultyScope(userId: string): Promise<string | undefined> {
  const access = await getEventAccess(userId);
  if (!access.manageAnyUnit && !access.facultyId) {
    throw new ApiError(409, "A primary faculty must be assigned");
  }
  return access.manageAnyUnit ? undefined : (access.facultyId ?? undefined);
}

function studentFacultyWhere(facultyId?: string): Prisma.StudentWhereInput {
  return facultyId ? { class: { is: { major: { is: { facultyId } } } } } : {};
}

async function assertStudentScope(userId: string, studentId: string) {
  const facultyId = await facultyScope(userId);
  const student = await prisma.student.findFirst({
    where: { id: studentId, ...studentFacultyWhere(facultyId) },
    select: { id: true },
  });
  if (!student) throw new ApiError(404, "Student not found in your faculty scope");
  return { facultyId };
}

async function recalculate(
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
        cappedScore: Math.min(Math.max(rawScore, 0), maximumById.get(item.criteriaId) ?? 0),
      },
    ];
  });
  await tx.conductScoreCriterionTotal.deleteMany({ where: { conductScoreId } });
  if (criteriaTotals.length)
    await tx.conductScoreCriterionTotal.createMany({ data: criteriaTotals });
  const uncategorized = grouped.find((item) => item.criteriaId === null)?._sum.points ?? 0;
  const totalScore = Math.min(
    100,
    Math.max(0, uncategorized + criteriaTotals.reduce((sum, item) => sum + item.cappedScore, 0)),
  );
  const ranking = rankingFor(totalScore);
  await tx.conductScore.update({ where: { id: conductScoreId }, data: { totalScore, ranking } });
  return { totalScore, ranking };
}

async function addDefaultCriterionEntries(
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

async function recalculateMany(
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

const scoreSelect = {
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

function conductScoreStudentWhere(
  facultyId: string | undefined,
  filters: ConductScoreFilters,
): Prisma.StudentWhereInput {
  const search = filters.search?.trim();
  const scoreFilter: Prisma.ConductScoreWhereInput = {
    semesterId: filters.semesterId,
    status: filters.status,
    ranking: filters.ranking,
  };
  return {
    AND: [
      studentFacultyWhere(facultyId),
      filters.facultyId
        ? { class: { is: { major: { is: { facultyId: filters.facultyId } } } } }
        : {},
      filters.majorId ? { class: { is: { majorId: filters.majorId } } } : {},
    ],
    ...(filters.classId ? { classId: filters.classId } : {}),
    ...(search
      ? {
          OR: [
            { studentCode: { contains: search, mode: "insensitive" } },
            { user: { is: { name: { contains: search, mode: "insensitive" } } } },
            { user: { is: { email: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
    ...(filters.status || filters.ranking ? { conductScores: { some: scoreFilter } } : {}),
  };
}

export async function listConductScores(
  userId: string,
  params: PaginationParams,
  filters: ConductScoreFilters,
) {
  const facultyId = await facultyScope(userId);
  const where = conductScoreStudentWhere(facultyId, filters);
  const [total, students] = await prisma.$transaction([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      select: {
        id: true,
        studentCode: true,
        user: { select: { name: true, email: true } },
        class: {
          select: {
            id: true,
            code: true,
            name: true,
            major: { select: { name: true } },
          },
        },
        conductScores: { where: { semesterId: filters.semesterId }, select: scoreSelect, take: 1 },
      },
      orderBy: [{ studentCode: "asc" }, { id: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return {
    items: students.map(({ conductScores, ...student }) => ({
      student: {
        ...student,
        major: student.class?.major.name ?? null,
        class: student.class
          ? { id: student.class.id, code: student.class.code, name: student.class.name }
          : null,
      },
      score: conductScores[0] ?? null,
    })),
    pagination: createPaginationMeta(total, params),
  };
}

export async function bulkFinalizeConductScores(
  userId: string,
  filters: ConductScoreFilters,
  studentIds?: string[],
) {
  const facultyId = await facultyScope(userId);
  const semester = await prisma.semester.findUnique({
    where: { id: filters.semesterId },
    select: { id: true },
  });
  if (!semester) throw new ApiError(400, "Semester does not exist");
  const where: Prisma.StudentWhereInput = studentIds
    ? { ...studentFacultyWhere(facultyId), id: { in: studentIds } }
    : conductScoreStudentWhere(facultyId, filters);
  const students = await prisma.student.findMany({
    where,
    select: { id: true },
    orderBy: { id: "asc" },
    take: BULK_FINALIZE_LIMIT + 1,
  });
  if (students.length > BULK_FINALIZE_LIMIT) {
    throw new ApiError(400, "Narrow the filters to at most 10000 students per operation");
  }
  const ids = students.map((student) => student.id);
  if (!ids.length) return { matched: 0, finalized: 0, alreadyFinal: 0 };

  const now = new Date();
  const finalized = await prisma.$transaction(
    async (tx) => {
      await tx.conductScore.createMany({
        data: ids.map((studentId) => ({ studentId, semesterId: filters.semesterId })),
        skipDuplicates: true,
      });
      const drafts = await tx.conductScore.findMany({
        where: { semesterId: filters.semesterId, studentId: { in: ids }, status: "DRAFT" },
        select: { id: true },
        orderBy: { id: "asc" },
      });
      if (!drafts.length) return 0;
      const draftIds = drafts.map((score) => score.id);
      await addDefaultCriterionEntries(tx, draftIds, userId);
      await recalculateMany(tx, draftIds);
      const updated = await tx.conductScore.updateMany({
        where: { id: { in: draftIds }, status: "DRAFT" },
        data: { status: "FINAL", finalizedAt: now, finalizedByUserId: userId },
      });
      if (!updated.count) return 0;
      if (updated.count !== draftIds.length) {
        throw new ApiError(409, "Conduct scores changed concurrently; retry the operation");
      }
      await tx.conductScoreStatusHistory.createMany({
        data: draftIds.map((conductScoreId) => ({
          conductScoreId,
          action: "FINALIZED" as const,
          actorUserId: userId,
        })),
      });
      return updated.count;
    },
    { maxWait: 5_000, timeout: 60_000 },
  );
  await invalidateDashboardCache(facultyId);
  return { matched: ids.length, finalized, alreadyFinal: ids.length - finalized };
}

async function detailedScore(studentId: string, semesterId: string) {
  const [student, criteriaCatalog] = await prisma.$transaction([
    prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentCode: true,
        user: { select: { name: true, email: true } },
        class: {
          select: {
            id: true,
            code: true,
            name: true,
            major: {
              select: {
                id: true,
                code: true,
                name: true,
                faculty: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
        conductScores: {
          where: { semesterId },
          select: {
            ...scoreSelect,
            semester: { select: { id: true, year: true, type: true } },
            finalizedBy: { select: { id: true, name: true } },
            entries: {
              select: {
                id: true,
                points: true,
                source: true,
                reason: true,
                result: true,
                createdAt: true,
                reversalOfId: true,
                criteria: {
                  select: { id: true, title: true, maxPoints: true, defaultPoints: true },
                },
                event: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
              },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            },
            statusHistory: {
              select: {
                id: true,
                action: true,
                reason: true,
                createdAt: true,
                actor: { select: { id: true, name: true } },
              },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            },
          },
          take: 1,
        },
      },
    }),
    prisma.criteria.findMany({
      select: { id: true, title: true, maxPoints: true, defaultPoints: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);
  if (!student) throw new ApiError(404, "Student not found");
  const { conductScores, ...profile } = student;
  return {
    student: { ...profile, major: profile.class?.major.name ?? null },
    score: conductScores[0] ?? null,
    criteriaCatalog,
  };
}

export async function getConductScore(userId: string, studentId: string, semesterId: string) {
  await assertStudentScope(userId, studentId);
  return detailedScore(studentId, semesterId);
}

export async function getMyConductScore(userId: string, semesterId: string) {
  const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) throw new ApiError(409, "Student profile is required");
  return detailedScore(student.id, semesterId);
}

export async function addAdjustment(
  userId: string,
  studentId: string,
  input: {
    semesterId: string;
    criteriaId: string;
    points: number;
    reason: string;
    result: string;
  },
) {
  const { facultyId } = await assertStudentScope(userId, studentId);
  const updated = await prisma.$transaction(async (tx) => {
    const criteria = await tx.criteria.findUnique({
      where: { id: input.criteriaId },
      select: { id: true },
    });
    if (!criteria) throw new ApiError(400, "Criteria does not exist");
    const semester = await tx.semester.findUnique({
      where: { id: input.semesterId },
      select: { id: true },
    });
    if (!semester) throw new ApiError(400, "Semester does not exist");
    const score = await tx.conductScore.upsert({
      where: { studentId_semesterId: { studentId, semesterId: input.semesterId } },
      update: {},
      create: { studentId, semesterId: input.semesterId },
    });
    if (score.status === "FINAL")
      throw new ApiError(409, "Finalized conduct score must be reopened first");
    await tx.conductScoreEntry.create({
      data: {
        conductScoreId: score.id,
        criteriaId: input.criteriaId,
        points: input.points,
        result: input.result,
        source: "MANUAL_ADJUSTMENT",
        reason: input.reason,
        createdByUserId: userId,
        idempotencyKey: `manual:${randomUUID()}`,
      },
    });
    await recalculate(tx, score.id);
    return tx.conductScore.findUniqueOrThrow({ where: { id: score.id }, select: scoreSelect });
  });
  await invalidateDashboardCache(facultyId);
  return updated;
}

export async function addBulkAdjustment(
  userId: string,
  input: {
    operationId: string;
    semesterId: string;
    criteriaId: string;
    reason: string;
    result: string;
    studentCodes: string[];
  },
) {
  if (input.studentCodes.length > BULK_ADJUSTMENT_LIMIT) {
    throw new ApiError(400, `A bulk adjustment supports at most ${BULK_ADJUSTMENT_LIMIT} students`);
  }
  const facultyId = await facultyScope(userId);
  const [criterion, semester, students] = await prisma.$transaction([
    prisma.criteria.findUnique({
      where: { id: input.criteriaId },
      select: { id: true, maxPoints: true, defaultPoints: true },
    }),
    prisma.semester.findUnique({ where: { id: input.semesterId }, select: { id: true } }),
    prisma.student.findMany({
      where: {
        studentCode: { in: input.studentCodes },
        ...studentFacultyWhere(facultyId),
      },
      select: { id: true, studentCode: true },
      orderBy: { id: "asc" },
    }),
  ]);
  if (!criterion) throw new ApiError(400, "Criteria does not exist");
  if (!semester) throw new ApiError(400, "Semester does not exist");

  const foundCodes = new Set(students.map((student) => student.studentCode));
  const notFoundCodes = input.studentCodes.filter((code) => !foundCodes.has(code));
  if (!students.length) {
    return { requested: input.studentCodes.length, applied: 0, skippedFinalized: 0, notFoundCodes };
  }

  const result = await prisma.$transaction(
    async (tx) => {
      await tx.conductScore.createMany({
        data: students.map((student) => ({
          studentId: student.id,
          semesterId: input.semesterId,
        })),
        skipDuplicates: true,
      });
      const scores = await tx.conductScore.findMany({
        where: {
          semesterId: input.semesterId,
          studentId: { in: students.map((student) => student.id) },
        },
        select: { id: true, status: true },
        orderBy: { id: "asc" },
      });
      const draftScoreIds = scores
        .filter((score) => score.status === "DRAFT")
        .map((score) => score.id);
      const skippedFinalized = scores.length - draftScoreIds.length;
      if (!draftScoreIds.length) return { applied: 0, skippedFinalized };

      const inserted = await tx.conductScoreEntry.createMany({
        data: draftScoreIds.map((conductScoreId) => ({
          conductScoreId,
          criteriaId: input.criteriaId,
          points: criterion.defaultPoints,
          result: input.result,
          source: "MANUAL_ADJUSTMENT" as const,
          reason: input.reason,
          createdByUserId: userId,
          idempotencyKey: `bulk:${input.operationId}:score:${conductScoreId}`,
        })),
        skipDuplicates: true,
      });
      if (!inserted.count) return { applied: 0, skippedFinalized };

      const scoreIds = Prisma.join(draftScoreIds.map((id) => Prisma.sql`${id}::uuid`));
      await tx.$executeRaw(Prisma.sql`
      INSERT INTO "conduct_score_criterion_totals" (
        "id", "conductScoreId", "criteriaId", "rawScore", "cappedScore", "updatedAt"
      )
      SELECT
        gen_random_uuid(),
        entry."conductScoreId",
        ${input.criteriaId}::uuid,
        SUM(entry."points")::integer,
        LEAST(GREATEST(SUM(entry."points"), 0), ${criterion.maxPoints})::integer,
        CURRENT_TIMESTAMP
      FROM "conduct_score_entries" entry
      WHERE entry."conductScoreId" IN (${scoreIds})
        AND entry."criteriaId" = ${input.criteriaId}::uuid
      GROUP BY entry."conductScoreId"
      ON CONFLICT ("conductScoreId", "criteriaId") DO UPDATE SET
        "rawScore" = EXCLUDED."rawScore",
        "cappedScore" = EXCLUDED."cappedScore",
        "updatedAt" = CURRENT_TIMESTAMP
    `);
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
      return { applied: inserted.count, skippedFinalized };
    },
    { maxWait: 5_000, timeout: 30_000 },
  );
  await invalidateDashboardCache(facultyId);
  return {
    requested: input.studentCodes.length,
    applied: result.applied,
    skippedFinalized: result.skippedFinalized,
    notFoundCodes,
  };
}

export async function changeFinalization(
  userId: string,
  studentId: string,
  semesterId: string,
  action: "FINALIZED" | "REOPENED",
  reason?: string,
) {
  const { facultyId } = await assertStudentScope(userId, studentId);
  const score = await prisma.$transaction(async (tx) => {
    const current = await tx.conductScore.findUnique({
      where: { studentId_semesterId: { studentId, semesterId } },
    });
    if (!current) throw new ApiError(404, "Conduct score has not been created");
    if (action === "FINALIZED" && current.status === "FINAL")
      throw new ApiError(409, "Conduct score is already finalized");
    if (action === "REOPENED" && current.status === "DRAFT")
      throw new ApiError(409, "Conduct score is already a draft");
    if (action === "FINALIZED") {
      await addDefaultCriterionEntries(tx, [current.id], userId);
      await recalculate(tx, current.id);
    }
    await tx.conductScoreStatusHistory.create({
      data: { conductScoreId: current.id, action, reason, actorUserId: userId },
    });
    return tx.conductScore.update({
      where: { id: current.id },
      data:
        action === "FINALIZED"
          ? { status: "FINAL", finalizedAt: new Date(), finalizedByUserId: userId }
          : { status: "DRAFT", finalizedAt: null, finalizedByUserId: null },
      select: scoreSelect,
    });
  });
  await invalidateDashboardCache(facultyId);
  return score;
}

type EventScoreSyncOptions = {
  allowFinalized?: boolean;
  reason?: string;
};

export async function syncEventConductScore(
  studentId: string,
  eventId: string,
  options: EventScoreSyncOptions = {},
): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      semesterId: true,
      criteriaId: true,
      points: true,
      checkInMode: true,
      timeEnd: true,
      organizer: { select: { facultyId: true } },
    },
  });
  if (!event) return;
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId, eventId },
    select: { id: true, direction: true, status: true, timeChecking: true },
    orderBy: [{ direction: "asc" }, { id: "asc" }],
  });
  const valid = (direction: "CHECK_IN" | "CHECK_OUT") =>
    records.some(
      (record) =>
        record.direction === direction &&
        (record.status === "ATTENDED" || record.status === "LATE"),
    );
  const eventEnded = event.timeEnd.getTime() <= Date.now();
  const completed =
    eventEnded && valid("CHECK_IN") && (event.checkInMode === "ONE_WAY" || valid("CHECK_OUT"));
  const stateHash = createHash("sha256").update(JSON.stringify(records)).digest("hex").slice(0, 20);
  await prisma
    .$transaction(async (tx) => {
      const score = await tx.conductScore.upsert({
        where: { studentId_semesterId: { studentId, semesterId: event.semesterId } },
        update: {},
        create: { studentId, semesterId: event.semesterId },
      });
      if (score.status === "FINAL" && !options.allowFinalized) return;
      const aggregate = await tx.conductScoreEntry.aggregate({
        where: { conductScoreId: score.id, eventId },
        _sum: { points: true },
        _count: { _all: true },
      });
      const current = aggregate._sum.points ?? 0;
      const desired = completed ? event.points : 0;
      const delta = desired - current;
      if (!delta) return;
      await tx.conductScoreEntry.create({
        data: {
          conductScoreId: score.id,
          criteriaId: event.criteriaId,
          eventId,
          points: delta,
          result: delta > 0 ? "ATTENDED" : "REVERSED",
          source: delta > 0 ? "EVENT" : "REVERSAL",
          reason:
            options.reason ??
            (delta > 0 ? "Event attendance completed" : "Event attendance no longer complete"),
          idempotencyKey: `event:${eventId}:student:${studentId}:entry:${aggregate._count._all}:state:${stateHash}`,
        },
      });
      await recalculate(tx, score.id);
    })
    .catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
      throw error;
    });
  await invalidateDashboardCache(event.organizer?.facultyId);
}

type EndedEventScoreCandidate = {
  studentId: string;
  eventId: string;
};

export async function syncEndedEventConductScores(limit = 100): Promise<number> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const candidates = await prisma.$queryRaw<EndedEventScoreCandidate[]>(Prisma.sql`
    WITH completed_attendance AS (
      SELECT
        record."studentId",
        record."eventId",
        BOOL_OR(
          record."direction" = 'CHECK_IN'::"AttendanceDirection"
          AND record."status" IN ('ATTENDED'::"AttendanceStatus", 'LATE'::"AttendanceStatus")
        ) AS "hasCheckIn",
        BOOL_OR(
          record."direction" = 'CHECK_OUT'::"AttendanceDirection"
          AND record."status" IN ('ATTENDED'::"AttendanceStatus", 'LATE'::"AttendanceStatus")
        ) AS "hasCheckOut"
      FROM "attendance_records" record
      INNER JOIN "events" event ON event."id" = record."eventId"
      WHERE event."timeEnd" <= CURRENT_TIMESTAMP
      GROUP BY record."studentId", record."eventId"
    )
    SELECT
      completed."studentId",
      completed."eventId"
    FROM completed_attendance completed
    INNER JOIN "events" event ON event."id" = completed."eventId"
    LEFT JOIN "conduct_scores" score
      ON score."studentId" = completed."studentId"
      AND score."semesterId" = event."semesterId"
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(entry."points"), 0)::integer AS points
      FROM "conduct_score_entries" entry
      WHERE entry."conductScoreId" = score."id"
        AND entry."eventId" = completed."eventId"
    ) current_score ON TRUE
    WHERE completed."hasCheckIn"
      AND (event."checkInMode" = 'ONE_WAY'::"CheckInMode" OR completed."hasCheckOut")
      AND COALESCE(current_score.points, 0) <> event."points"
    ORDER BY event."timeEnd" ASC, completed."eventId" ASC, completed."studentId" ASC
    LIMIT ${safeLimit}
  `);

  for (const candidate of candidates) {
    await syncEventConductScore(candidate.studentId, candidate.eventId);
  }
  return candidates.length;
}
