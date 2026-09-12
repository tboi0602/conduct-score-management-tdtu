import type { OrganizingUnitType, Prisma } from "@prisma/client";
import { prisma } from "@config/prisma";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";
import { mapCrudError } from "@utils/crudError";
import type { EventAccess } from "@services/events/event-access.service";

export type OrganizerFilters = { search?: string; type?: OrganizingUnitType; facultyId?: string };
export type ClubInput = { code: string; name: string; facultyId?: string | null };

const select = {
  id: true,
  type: true,
  code: true,
  name: true,
  facultyId: true,
  classId: true,
  createdAt: true,
  updatedAt: true,
  faculty: { select: { id: true, code: true, name: true } },
  class: {
    select: {
      id: true,
      code: true,
      name: true,
      major: { select: { faculty: { select: { id: true, code: true, name: true } } } },
    },
  },
  _count: { select: { events: true } },
} satisfies Prisma.OrganizingUnitSelect;

export async function listOrganizers(
  params: PaginationParams,
  filters: OrganizerFilters,
  access: EventAccess,
  writableOnly = false,
) {
  const scope = access.manageAnyUnit
    ? {}
    : { facultyId: access.facultyId ?? "00000000-0000-0000-0000-000000000000" };
  const where: Prisma.OrganizingUnitWhereInput = {
    AND: [scope, filters.facultyId ? { facultyId: filters.facultyId } : {}],
    type: filters.type,
    ...(filters.search
      ? {
          OR: [
            { code: { contains: filters.search, mode: "insensitive" } },
            { name: { contains: filters.search, mode: "insensitive" } },
            { faculty: { is: { name: { contains: filters.search, mode: "insensitive" } } } },
            {
              class: {
                is: {
                  OR: [
                    { code: { contains: filters.search, mode: "insensitive" } },
                    { name: { contains: filters.search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
    ...(writableOnly && !access.manageAnyUnit
      ? { type: { in: ["FACULTY", "CLASS", "CLUB"] } }
      : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.organizingUnit.count({ where }),
    prisma.organizingUnit.findMany({
      where,
      select,
      orderBy: [{ type: "asc" }, { code: "asc" }, { id: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return { items, pagination: createPaginationMeta(total, params) };
}

export async function createClub(input: ClubInput) {
  if (input.facultyId) {
    const exists = await prisma.faculty.findUnique({
      where: { id: input.facultyId },
      select: { id: true },
    });
    if (!exists) throw new ApiError(409, "Faculty does not exist");
  }
  return prisma.organizingUnit
    .create({
      data: {
        type: "CLUB",
        code: input.code,
        name: input.name,
        facultyId: input.facultyId ?? null,
      },
      select,
    })
    .catch(mapCrudError);
}

export async function updateClub(id: string, input: ClubInput) {
  const current = await prisma.organizingUnit.findUnique({
    where: { id },
    select: { type: true, facultyId: true, _count: { select: { events: true } } },
  });
  if (!current) throw new ApiError(404, "Organizing unit not found");
  if (current.type !== "CLUB")
    throw new ApiError(400, "System organizing units cannot be modified");
  if (current._count.events > 0 && current.facultyId !== (input.facultyId ?? null))
    throw new ApiError(409, "Cannot change the parent of an organizing unit in use");
  return prisma.organizingUnit
    .update({
      where: { id },
      data: { code: input.code, name: input.name, facultyId: input.facultyId ?? null },
      select,
    })
    .catch(mapCrudError);
}

export async function deleteClub(id: string) {
  const current = await prisma.organizingUnit.findUnique({
    where: { id },
    select: { type: true, _count: { select: { events: true } } },
  });
  if (!current) throw new ApiError(404, "Organizing unit not found");
  if (current.type !== "CLUB") throw new ApiError(400, "System organizing units cannot be deleted");
  if (current._count.events > 0) throw new ApiError(409, "Organizing unit is used by events");
  await prisma.organizingUnit.delete({ where: { id } }).catch(mapCrudError);
}
