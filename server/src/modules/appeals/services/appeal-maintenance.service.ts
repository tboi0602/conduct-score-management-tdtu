import { prisma } from "@config/prisma";
import { syncEventConductScore } from "@modules/conduct-score";
import { deleteEvidence } from "./evidence.service";

export async function cleanupResolvedAppeals(): Promise<number> {
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const expired = await prisma.attendanceAppeal.findMany({
    where: { status: { in: ["APPROVED", "REJECTED"] }, reviewedAt: { lte: cutoff } },
    select: { id: true, evidenceKey: true },
    take: 100,
  });
  let removed = 0;
  for (const item of expired) {
    try {
      await deleteEvidence(item.evidenceKey);
      await prisma.attendanceAppeal.delete({ where: { id: item.id } });
      removed += 1;
    } catch {
      // Keep the row and object key so the next cleanup pass can retry safely.
    }
  }
  return removed;
}

export async function reconcileApprovedAppealScores(): Promise<number> {
  const approved = await prisma.attendanceAppeal.findMany({
    where: { status: "APPROVED" },
    select: { id: true, studentId: true, eventId: true },
    orderBy: [{ reviewedAt: "asc" }, { id: "asc" }],
    take: 100,
  });

  for (const appeal of approved) {
    await syncEventConductScore(appeal.studentId, appeal.eventId, {
      allowFinalized: true,
      reason: `Attendance restored after approved appeal ${appeal.id}`,
    });
  }

  return approved.length;
}
