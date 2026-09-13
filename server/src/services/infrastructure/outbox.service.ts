import { Prisma } from "@prisma/client";
import { prisma } from "@config/prisma";
import { attendanceOutboxPending, attendanceOutboxPublishTotal } from "@metrics";
import { publishAttendanceEvent } from "@producers/attendance.producer";

type LockedOutbox = {
  id: string;
  eventType: string;
  correlationId: string;
  payload: Prisma.JsonValue;
  attempts: number;
};

export async function relayOutboxBatch(limit = 50): Promise<number> {
  const processed = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<LockedOutbox[]>(Prisma.sql`
      SELECT "id", "eventType", "correlationId", "payload", "attempts"
      FROM "outbox_events"
      WHERE "publishedAt" IS NULL AND "nextAttemptAt" <= NOW()
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    `);
    for (const row of rows) {
      try {
        await publishAttendanceEvent(row.eventType, row.payload as Record<string, unknown>, {
          messageId: row.id,
          correlationId: row.correlationId,
        });
        await tx.outboxEvent.update({
          where: { id: row.id },
          data: { publishedAt: new Date(), attempts: { increment: 1 }, lastError: null },
        });
        attendanceOutboxPublishTotal.inc({ result: "success" });
      } catch (error) {
        const attempts = row.attempts + 1;
        await tx.outboxEvent.update({
          where: { id: row.id },
          data: {
            attempts,
            nextAttemptAt: new Date(Date.now() + Math.min(30_000, 500 * 2 ** attempts)),
            lastError: (error as Error).message.slice(0, 500),
          },
        });
        attendanceOutboxPublishTotal.inc({ result: "failure" });
      }
    }
    return rows.length;
  });
  attendanceOutboxPending.set(await prisma.outboxEvent.count({ where: { publishedAt: null } }));
  return processed;
}

export function startOutboxRelay(): () => void {
  const timer = setInterval(() => void relayOutboxBatch().catch(() => undefined), 250);
  timer.unref();
  return () => clearInterval(timer);
}
