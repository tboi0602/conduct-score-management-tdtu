import type { PrismaClient, SemesterType } from "@prisma/client";

const years = [2026, 2027, 2028, 2029, 2030] as const;
const types: SemesterType[] = ["HK1", "HK2", "HK3"];

function dates(year: number, type: SemesterType) {
  if (type === "HK1")
    return {
      startDate: new Date(`${year}-09-01T00:00:00.000Z`),
      endDate: new Date(`${year + 1}-01-31T00:00:00.000Z`),
    };
  if (type === "HK2")
    return {
      startDate: new Date(`${year}-02-01T00:00:00.000Z`),
      endDate: new Date(`${year}-06-30T00:00:00.000Z`),
    };
  return {
    startDate: new Date(`${year}-07-01T00:00:00.000Z`),
    endDate: new Date(`${year}-08-31T00:00:00.000Z`),
  };
}

export async function seedSemesters(prisma: PrismaClient): Promise<void> {
  for (const year of years) {
    for (const type of types) {
      await prisma.semester.upsert({
        where: { year_type: { year, type } },
        update: dates(year, type),
        create: { year, type, ...dates(year, type) },
      });
    }
  }
}
