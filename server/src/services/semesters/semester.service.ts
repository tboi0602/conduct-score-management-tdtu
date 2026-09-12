import { Prisma, type SemesterType } from "@prisma/client";
import { prisma } from "@config/prisma";
import { ApiError } from "@utils/ApiError";
import { mapCrudError } from "@utils/crudError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";

export type SemesterInput = { year: number; type: SemesterType };
export type SemesterFilters = { year?: number; type?: SemesterType };

const select = {
  id: true,
  year: true,
  type: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { events: true, conductScores: true } },
} satisfies Prisma.SemesterSelect;

export async function listSemesters(params: PaginationParams, filters: SemesterFilters) {
  const where: Prisma.SemesterWhereInput = { year: filters.year, type: filters.type };
  const [total, items] = await prisma.$transaction([
    prisma.semester.count({ where }),
    prisma.semester.findMany({
      where,
      select,
      orderBy: [{ year: "desc" }, { type: "asc" }, { id: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return { items, pagination: createPaginationMeta(total, params) };
}

export async function createSemester(input: SemesterInput) {
  return prisma.semester.create({ data: input, select }).catch(mapCrudError);
}

export async function updateSemester(id: string, input: SemesterInput) {
  return prisma.semester.update({ where: { id }, data: input, select }).catch(mapCrudError);
}

export async function deleteSemester(id: string): Promise<void> {
  await prisma
    .$transaction(async (tx) => {
      const semester = await tx.semester.findUnique({
        where: { id },
        select: { id: true, _count: { select: { events: true, conductScores: true } } },
      });
      if (!semester) throw new ApiError(404, "Semester not found");
      if (semester._count.events || semester._count.conductScores) {
        throw new ApiError(409, "Semester is in use and cannot be deleted");
      }
      await tx.semester.delete({ where: { id }, select: { id: true } });
    })
    .catch(mapCrudError);
}
