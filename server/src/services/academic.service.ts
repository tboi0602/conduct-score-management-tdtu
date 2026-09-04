import { prisma } from "@config/prisma";

export async function getAcademicOptions() {
  return prisma.faculty.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      majors: {
        select: {
          id: true,
          code: true,
          name: true,
          classes: {
            select: { id: true, code: true, name: true },
            orderBy: { code: "asc" },
          },
        },
        orderBy: { code: "asc" },
      },
    },
    orderBy: { code: "asc" },
  });
}
