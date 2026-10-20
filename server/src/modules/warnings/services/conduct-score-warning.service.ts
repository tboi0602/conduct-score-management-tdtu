import { Prisma } from "@prisma/client";
import { prisma } from "@config/prisma";
import {
  CONDUCT_SCORE_WARNING_THRESHOLD,
  FINAL_WARNING_WINDOW_DAYS,
  dateInVietnam,
  warningMilestonesForDate,
  warningNotificationTitle,
} from "@modules/warnings/services/conduct-score-warning-milestone";

const LEGACY_FINAL_WARNING_TITLE = "CONDUCT_SCORE_WARNING";

export async function evaluateConductScoreWarnings(now = new Date()): Promise<number> {
  const evaluationDate = dateInVietnam(now);
  const finalWindowEnd = new Date(
    evaluationDate.getTime() + FINAL_WARNING_WINDOW_DAYS * 86_400_000,
  );

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "conduct_score_warnings" (
        "id", "studentId", "semesterId", "observedScore", "threshold", "status", "createdAt", "updatedAt"
      )
      SELECT gen_random_uuid(), s."id", sem."id", COALESCE(cs."totalScore", 0),
        ${CONDUCT_SCORE_WARNING_THRESHOLD}, 'ACTIVE'::"ConductScoreWarningStatus", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM "semesters" sem
      CROSS JOIN "students" s
      LEFT JOIN "conduct_scores" cs ON cs."studentId" = s."id" AND cs."semesterId" = sem."id"
      WHERE (
          sem."startDate" + ((sem."endDate" - sem."startDate") / 2) = CAST(${evaluationDate} AS date)
          OR (
            sem."endDate" >= CAST(${evaluationDate} AS date)
            AND sem."endDate" <= CAST(${finalWindowEnd} AS date)
          )
        )
        AND COALESCE(cs."totalScore", 0) < ${CONDUCT_SCORE_WARNING_THRESHOLD}
      ON CONFLICT ("studentId", "semesterId") DO UPDATE SET
        "observedScore" = EXCLUDED."observedScore",
        "threshold" = EXCLUDED."threshold",
        "status" = 'ACTIVE'::"ConductScoreWarningStatus",
        "resolvedAt" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
    `);

    await tx.$executeRaw(Prisma.sql`
      UPDATE "conduct_score_warnings" w
      SET "observedScore" = COALESCE((
            SELECT cs."totalScore"
            FROM "conduct_scores" cs
            WHERE cs."semesterId" = w."semesterId" AND cs."studentId" = w."studentId"
          ), 0),
          "threshold" = ${CONDUCT_SCORE_WARNING_THRESHOLD},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE w."status" = 'ACTIVE'::"ConductScoreWarningStatus"
    `);
    await tx.$executeRaw(Prisma.sql`
      UPDATE "conduct_score_warnings" w
      SET "status" = 'RESOLVED'::"ConductScoreWarningStatus", "resolvedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
      FROM "semesters" sem
      WHERE w."semesterId" = sem."id" AND w."status" = 'ACTIVE'::"ConductScoreWarningStatus"
        AND (sem."endDate" < CAST(${evaluationDate} AS date) OR COALESCE((
          SELECT cs."totalScore"
          FROM "conduct_scores" cs
          WHERE cs."semesterId" = w."semesterId" AND cs."studentId" = w."studentId"
        ), 0) >= w."threshold")
    `);

    const activeWarnings = await tx.conductScoreWarning.findMany({
      where: {
        status: "ACTIVE",
        semester: {
          startDate: { lte: evaluationDate },
          endDate: { gte: evaluationDate },
        },
      },
      select: {
        id: true,
        threshold: true,
        student: { select: { userId: true } },
        semester: { select: { startDate: true, endDate: true } },
      },
    });
    const candidates = activeWarnings.flatMap((warning) =>
      warningMilestonesForDate(warning.semester.startDate, warning.semester.endDate, now).map(
        (milestone) => ({
          warningId: warning.id,
          userId: warning.student.userId,
          threshold: warning.threshold,
          milestone,
          title: warningNotificationTitle(milestone),
        }),
      ),
    );
    if (!candidates.length) return 0;

    const existingNotifications = await tx.userNotification.findMany({
      where: {
        type: "CONDUCT_SCORE_WARNING",
        entityId: { in: candidates.map(({ warningId }) => warningId) },
        title: {
          in: [
            LEGACY_FINAL_WARNING_TITLE,
            "CONDUCT_SCORE_WARNING_MIDPOINT",
            "CONDUCT_SCORE_WARNING_FINAL_WINDOW",
          ],
        },
      },
      select: { entityId: true, title: true },
    });
    const alreadySent = new Set(
      existingNotifications.flatMap((notification) =>
        notification.entityId ? [`${notification.entityId}:${notification.title}`] : [],
      ),
    );
    const notifications = candidates.filter((candidate) => {
      if (alreadySent.has(`${candidate.warningId}:${candidate.title}`)) return false;
      return !(
        candidate.milestone === "FINAL_WINDOW" &&
        alreadySent.has(`${candidate.warningId}:${LEGACY_FINAL_WARNING_TITLE}`)
      );
    });
    if (!notifications.length) return 0;

    const created = await tx.userNotification.createMany({
      data: notifications.map((notification) => ({
        userId: notification.userId,
        type: "CONDUCT_SCORE_WARNING" as const,
        title: notification.title,
        message: String(notification.threshold),
        entityId: notification.warningId,
      })),
    });
    return created.count;
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
