import { prisma } from "@config/prisma";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";

export async function listSemesterOptions(params: PaginationParams, year?: number) {
  const where = { year };
  const [total, items] = await prisma.$transaction([
    prisma.semester.count({ where }),
    prisma.semester.findMany({
      where,
      select: { id: true, year: true, type: true },
      orderBy: [{ year: "desc" }, { type: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return { items, pagination: createPaginationMeta(total, params) };
}
