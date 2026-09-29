import { createHash } from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@config/prisma";
import { recalculate } from "@modules/conduct-score/queries/conduct-score-projection.queries";
import { invalidateDashboardCache } from "@modules/dashboard";
export type EventScoreSyncOptions = {
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
