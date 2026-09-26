import type { PrismaClient } from "@prisma/client";

const sessions = [
  { name: "Ca 1", startTime: "06:55:00", endTime: "09:20:00" },
  { name: "Ca 2", startTime: "09:30:00", endTime: "12:00:00" },
  { name: "Ca 3", startTime: "12:45:00", endTime: "15:15:00" },
  { name: "Ca 4", startTime: "15:25:00", endTime: "17:55:00" },
  { name: "Ca 5", startTime: "18:05:00", endTime: "20:35:00" },
] as const;

const time = (value: string) => new Date(`1970-01-01T${value}.000Z`);

export async function seedClassSessions(prisma: PrismaClient): Promise<void> {
  for (const session of sessions) {
    await prisma.classSession.upsert({
      where: { name: session.name },
      update: { startTime: time(session.startTime), endTime: time(session.endTime) },
      create: {
        name: session.name,
        startTime: time(session.startTime),
        endTime: time(session.endTime),
      },
    });
  }
}
