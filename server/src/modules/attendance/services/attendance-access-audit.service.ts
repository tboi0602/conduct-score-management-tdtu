import { prisma } from "@config/prisma";

export async function recordAccessAudit(payload: {
  requestId: string;
  clientAttemptId: string | null;
  userId: string | null;
  eventId: string | null;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  instance: string;
  createdAt: string;
}) {
  const student = payload.userId
    ? await prisma.student.findUnique({
        where: { userId: payload.userId },
        select: { id: true },
      })
    : null;
  await prisma.attendanceAccessAudit.upsert({
    where: { requestId: payload.requestId },
    update: {},
    create: { ...payload, studentId: student?.id, createdAt: new Date(payload.createdAt) },
  });
}
