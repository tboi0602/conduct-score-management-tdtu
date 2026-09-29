import { Prisma } from "@prisma/client";
import { prisma } from "@config/prisma";

const WARNING_THRESHOLD = 80;
const WARNING_WINDOW_DAYS = 14;

export async function evaluateConductScoreWarnings(now = new Date()): Promise<number> {
  const windowEnd = new Date(now.getTime() + WARNING_WINDOW_DAYS * 86_400_000);
  return prisma.$transaction(async (tx) => {
    const inserted = await tx.$queryRaw<Array<{ id: string; studentId: string }>>(Prisma.sql`
      INSERT INTO "conduct_score_warnings" (
        "id", "studentId", "semesterId", "observedScore", "threshold", "status", "createdAt", "updatedAt"
      )
      SELECT gen_random_uuid(), s."id", sem."id", COALESCE(cs."totalScore", 0),
        ${WARNING_THRESHOLD}, 'ACTIVE'::"ConductScoreWarningStatus", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM "semesters" sem
      CROSS JOIN "students" s
      LEFT JOIN "conduct_scores" cs ON cs."studentId" = s."id" AND cs."semesterId" = sem."id"
      WHERE sem."endDate" >= ${now} AND sem."endDate" <= ${windowEnd}
        AND COALESCE(cs."totalScore", 0) < ${WARNING_THRESHOLD}
      ON CONFLICT ("studentId", "semesterId") DO UPDATE SET
        "observedScore" = EXCLUDED."observedScore",
        "threshold" = EXCLUDED."threshold",
        "status" = 'ACTIVE'::"ConductScoreWarningStatus",
        "resolvedAt" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "conduct_score_warnings"."status" = 'RESOLVED'::"ConductScoreWarningStatus"
      RETURNING "id", "studentId"
    `);

    await tx.$executeRaw(Prisma.sql`
      UPDATE "conduct_score_warnings" w
      SET "observedScore" = COALESCE((
            SELECT cs."totalScore"
            FROM "conduct_scores" cs
            WHERE cs."semesterId" = w."semesterId" AND cs."studentId" = w."studentId"
          ), 0),
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE w."status" = 'ACTIVE'::"ConductScoreWarningStatus"
    `);
    await tx.$executeRaw(Prisma.sql`
      UPDATE "conduct_score_warnings" w
      SET "status" = 'RESOLVED'::"ConductScoreWarningStatus", "resolvedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
      FROM "semesters" sem
      WHERE w."semesterId" = sem."id" AND w."status" = 'ACTIVE'::"ConductScoreWarningStatus"
        AND (sem."endDate" < ${now} OR COALESCE((
          SELECT cs."totalScore"
          FROM "conduct_scores" cs
          WHERE cs."semesterId" = w."semesterId" AND cs."studentId" = w."studentId"
        ), 0) >= w."threshold")
    `);

    const students = inserted.length
      ? await tx.student.findMany({
          where: { id: { in: inserted.map(({ studentId }) => studentId) } },
          select: { id: true, userId: true },
        })
      : [];
    const userByStudent = new Map(students.map((student) => [student.id, student.userId]));
    if (inserted.length) {
      await tx.userNotification.createMany({
        data: inserted.flatMap((warning) => {
          const userId = userByStudent.get(warning.studentId);
          return userId
            ? [
                {
                  userId,
                  type: "CONDUCT_SCORE_WARNING" as const,
                  title: "CONDUCT_SCORE_WARNING",
                  message: String(WARNING_THRESHOLD),
                  entityId: warning.id,
                },
              ]
            : [];
        }),
      });
    }
    return inserted.length;
  });
}

export async function listActiveForUser(userId: string) {
  return prisma.conductScoreWarning.findMany({
    where: { student: { userId }, status: "ACTIVE" },
    orderBy: [{ semester: { endDate: "asc" } }, { id: "asc" }],
    select: {
      id: true,
      observedScore: true,
      threshold: true,
      createdAt: true,
      semester: { select: { id: true, type: true, year: true, endDate: true } },
    },
  });
}

export async function cleanupAttendanceEvidence(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 30 * 86_400_000);
  const [incidents, audits] = await prisma.$transaction([
    prisma.attendanceClientIncident.deleteMany({ where: { failedAt: { lt: cutoff } } }),
    prisma.attendanceAccessAudit.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);
  return incidents.count + audits.count;
}
