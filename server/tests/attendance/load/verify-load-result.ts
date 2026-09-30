import "dotenv/config";

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { prisma } from "../../../src/config/prisma";

type Manifest = { eventId: string; students: Array<{ studentId: string }> };
const artifactDir = resolve(process.cwd(), "tests/.artifacts");
const timeoutSeconds = Number(process.env.ATTENDANCE_QUEUE_DRAIN_SECONDS ?? 120);

async function main(): Promise<void> {
  const manifest = JSON.parse(
    await readFile(resolve(artifactDir, "attendance-load-manifest.json"), "utf8"),
  ) as Manifest;
  const expectedRecords = Number(
    process.env.EXPECTED_ATTENDANCE_RECORDS ?? manifest.students.length,
  );
  const startedAt = Date.now();
  let pending = 0;
  do {
    pending = await prisma.attendanceScanRequest.count({
      where: { eventId: manifest.eventId, status: "PENDING" },
    });
    if (pending === 0) break;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
  } while (Date.now() - startedAt < timeoutSeconds * 1000);

  const [requestGroups, recordCount, duplicateRecords, conductEntries, unpublishedOutbox] =
    await Promise.all([
      prisma.attendanceScanRequest.groupBy({
        by: ["source", "status"],
        where: { eventId: manifest.eventId },
        _count: { _all: true },
      }),
      prisma.attendanceRecord.count({ where: { eventId: manifest.eventId } }),
      prisma.attendanceRecord.groupBy({
        by: ["studentId", "eventId", "direction"],
        where: { eventId: manifest.eventId },
        _count: { _all: true },
        having: { id: { _count: { gt: 1 } } },
      }),
      prisma.conductScoreEntry.count({ where: { eventId: manifest.eventId, source: "EVENT" } }),
      prisma.outboxEvent.count({
        where: { aggregateType: "AttendanceScanRequest", publishedAt: null },
      }),
    ]);

  const result = {
    generatedAt: new Date().toISOString(),
    eventId: manifest.eventId,
    expectedRecords,
    queueDrainSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(3)),
    pending,
    requestGroups,
    recordCount,
    duplicateRecordGroups: duplicateRecords.length,
    conductEntries,
    unpublishedOutbox,
    pass:
      pending === 0 &&
      recordCount === expectedRecords &&
      duplicateRecords.length === 0 &&
      conductEntries <= expectedRecords,
  };
  await mkdir(artifactDir, { recursive: true });
  await writeFile(
    resolve(artifactDir, "attendance-verification.json"),
    JSON.stringify(result, null, 2),
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.pass) process.exitCode = 1;
}

main().finally(async () => prisma.$disconnect());
