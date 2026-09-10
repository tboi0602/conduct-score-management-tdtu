import type { Prisma } from "@prisma/client";

import { prisma } from "@config/prisma";
import { getEventAccess } from "@services/event-access.service";
import { ApiError } from "@utils/ApiError";
import { mapCrudError } from "@utils/crudError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";

type ClassInput = { code: string; name: string; majorId: string };

async function classAccess(userId: string) {
  const access = await getEventAccess(userId);
  if (!access.manageAnyUnit && !access.facultyId) throw new ApiError(409, "A primary faculty must be assigned");
  return access;
}

export async function listFacultyClasses(userId: string, params: PaginationParams, filters: { search?: string; majorId?: string }) {
  const access = await classAccess(userId);
  const where: Prisma.ClassWhereInput = {
    ...(filters.search ? { OR: [{ code: { contains: filters.search, mode: "insensitive" } }, { name: { contains: filters.search, mode: "insensitive" } }] } : {}),
    ...(filters.majorId ? { majorId: filters.majorId } : {}),
    ...(!access.manageAnyUnit ? { major: { is: { facultyId: access.facultyId! } } } : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.class.count({ where }),
    prisma.class.findMany({ where, include: { major: { include: { faculty: { select: { id: true, code: true, name: true } } } }, _count: { select: { students: true } } }, orderBy: [{ code: "asc" }, { id: "asc" }], skip: params.skip, take: params.limit }),
  ]);
  return { items, pagination: createPaginationMeta(total, params) };
}

async function assertMajor(majorId: string, facultyId?: string | null) {
  const major = await prisma.major.findFirst({ where: { id: majorId, ...(facultyId ? { facultyId } : {}) }, select: { id: true, facultyId: true } });
  if (!major) throw new ApiError(403, "Target major is outside your faculty scope");
  return major;
}

export async function createFacultyClass(userId: string, input: ClassInput) {
  const access = await classAccess(userId);
  const major = await assertMajor(input.majorId, access.manageAnyUnit ? undefined : access.facultyId);
  return prisma.$transaction(async (tx) => {
    const item = await tx.class.create({ data: input, include: { major: { include: { faculty: true } } } });
    await tx.organizingUnit.create({ data: { type: "CLASS", code: `CLASS:${item.code}`, facultyId: major.facultyId, classId: item.id } });
    return item;
  }).catch(mapCrudError);
}

export async function updateFacultyClass(userId: string, id: string, input: ClassInput) {
  const access = await classAccess(userId);
  const current = await prisma.class.findFirst({ where: { id, ...(!access.manageAnyUnit ? { major: { is: { facultyId: access.facultyId! } } } : {}) }, include: { organizingUnit: { include: { _count: { select: { events: true } } } } } });
  if (!current) throw new ApiError(404, "Class not found in your faculty scope");
  const targetMajor = await assertMajor(input.majorId, access.manageAnyUnit ? undefined : access.facultyId);
  if (current.organizingUnit?._count.events && current.majorId !== input.majorId) throw new ApiError(409, "Cannot move a class used by events");
  return prisma.$transaction(async (tx) => {
    const item = await tx.class.update({ where: { id }, data: input, include: { major: { include: { faculty: true } } } });
    await tx.organizingUnit.updateMany({ where: { classId: id }, data: { code: `CLASS:${item.code}`, facultyId: targetMajor.facultyId } });
    return item;
  }).catch(mapCrudError);
}
