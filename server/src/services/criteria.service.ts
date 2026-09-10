import type { Prisma } from "@prisma/client";
import { prisma } from "@config/prisma";
import { ApiError } from "@utils/ApiError";
import { mapCrudError } from "@utils/crudError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";

export type CriteriaInput = { title: string; maxPoints: number };
export type CriteriaFilters = {
  search?: string;
  minPoints?: number;
  maxPoints?: number;
};

const criteriaSelect = {
  id: true,
  title: true,
  maxPoints: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CriteriaSelect;

export async function listCriteria(
  params: PaginationParams,
  filters: CriteriaFilters,
) {
  const where: Prisma.CriteriaWhereInput = {
    title: filters.search
      ? { contains: filters.search, mode: "insensitive" }
      : undefined,
    maxPoints: { gte: filters.minPoints, lte: filters.maxPoints },
  };
  const [total, items] = await prisma.$transaction([
    prisma.criteria.count({ where }),
    prisma.criteria.findMany({
      where,
      select: criteriaSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return { items, pagination: createPaginationMeta(total, params) };
}

export async function findCriteriaById(id: string) {
  const criteria = await prisma.criteria.findUnique({
    where: { id },
    select: criteriaSelect,
  });
  if (!criteria) throw new ApiError(404, "Criteria not found");
  return criteria;
}

export async function createCriteria(input: CriteriaInput) {
  return prisma.criteria
    .create({ data: input, select: criteriaSelect })
    .catch(mapCrudError);
}

export async function updateCriteria(id: string, input: CriteriaInput) {
  return prisma.criteria
    .update({ where: { id }, data: input, select: criteriaSelect })
    .catch(mapCrudError);
}

export async function deleteCriteria(id: string): Promise<void> {
  await prisma
    .$transaction(async (tx) => {
      // Lock the parent so an event cannot acquire a new FK reference between
      // the usage check and deletion. Only this criterion is locked.
      const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM criteria WHERE id = ${id}::uuid FOR UPDATE
    `;
      if (!rows.length) throw new ApiError(404, "Criteria not found");
      const event = await tx.event.findFirst({
        where: { criteriaId: id },
        select: { id: true },
      });
      if (event)
        throw new ApiError(
          409,
          "Criteria is used by events and cannot be deleted",
        );
      await tx.criteria.delete({ where: { id }, select: { id: true } });
    })
    .catch(mapCrudError);
}
