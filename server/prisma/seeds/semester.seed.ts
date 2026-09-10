import type { PrismaClient, SemesterType } from "@prisma/client";

const years = [2026, 2027, 2028, 2029, 2030] as const;
const types: SemesterType[] = ["HK1", "HK2"];

export async function seedSemesters(prisma: PrismaClient): Promise<void> {
  for (const year of years) {
    for (const type of types) {
      await prisma.semester.upsert({
        where: { year_type: { year, type } },
        update: {},
        create: { year, type },
      });
    }
  }
}
