import type { Prisma } from "@prisma/client";
import { prisma } from "@config/prisma";
import { ApiError } from "@utils/ApiError";
import { mapCrudError } from "@utils/crudError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";

export type AcademicKind = "faculties" | "majors" | "classes";
export type AcademicInput = { code: string; name: string; facultyId?: string; majorId?: string };
export type AcademicFilters = { search?: string; facultyId?: string; majorId?: string };

export async function list(kind: AcademicKind, params: PaginationParams, filters: AcademicFilters) {
  const text = filters.search
    ? {
        OR: [
          { code: { contains: filters.search, mode: "insensitive" as const } },
          { name: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }
    : {};
  if (kind === "faculties") {
    const where: Prisma.FacultyWhereInput = text;
    const [total, items] = await prisma.$transaction([
      prisma.faculty.count({ where }),
      prisma.faculty.findMany({
        where,
        include: { _count: { select: { majors: true, primaryUsers: true } } },
        orderBy: [{ code: "asc" }, { id: "asc" }],
        skip: params.skip,
        take: params.limit,
      }),
    ]);
    return { items, pagination: createPaginationMeta(total, params) };
  }
  if (kind === "majors") {
    const where: Prisma.MajorWhereInput = { ...text, facultyId: filters.facultyId };
    const [total, items] = await prisma.$transaction([
      prisma.major.count({ where }),
      prisma.major.findMany({
        where,
        include: {
          faculty: { select: { id: true, code: true, name: true } },
          _count: { select: { classes: true } },
        },
        orderBy: [{ code: "asc" }, { id: "asc" }],
        skip: params.skip,
        take: params.limit,
      }),
    ]);
    return { items, pagination: createPaginationMeta(total, params) };
  }
  const where: Prisma.ClassWhereInput = {
    ...text,
    majorId: filters.majorId,
    ...(filters.facultyId ? { major: { is: { facultyId: filters.facultyId } } } : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.class.count({ where }),
    prisma.class.findMany({
      where,
      include: {
        major: { include: { faculty: { select: { id: true, code: true, name: true } } } },
        _count: { select: { students: true } },
      },
      orderBy: [{ code: "asc" }, { id: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return { items, pagination: createPaginationMeta(total, params) };
}

export async function create(kind: AcademicKind, input: AcademicInput) {
  if (kind === "faculties")
    return prisma
      .$transaction(async (tx) => {
        const item = await tx.faculty.create({ data: { code: input.code, name: input.name } });
        await tx.organizingUnit.create({
          data: { type: "FACULTY", code: `FACULTY:${item.code}`, facultyId: item.id },
        });
        return item;
      })
      .catch(mapCrudError);
  if (kind === "majors") {
    if (!input.facultyId) throw new ApiError(400, "facultyId is required");
    return prisma.major
      .create({
        data: { code: input.code, name: input.name, facultyId: input.facultyId },
        include: { faculty: true },
      })
      .catch(mapCrudError);
  }
  if (!input.majorId) throw new ApiError(400, "majorId is required");
  return prisma
    .$transaction(async (tx) => {
      const major = await tx.major.findUnique({ where: { id: input.majorId! } });
      if (!major) throw new ApiError(409, "Major does not exist");
      const item = await tx.class.create({
        data: { code: input.code, name: input.name, majorId: input.majorId! },
      });
      await tx.organizingUnit.create({
        data: {
          type: "CLASS",
          code: `CLASS:${item.code}`,
          facultyId: major.facultyId,
          classId: item.id,
        },
      });
      return item;
    })
    .catch(mapCrudError);
}

export async function update(kind: AcademicKind, id: string, input: AcademicInput) {
  if (kind === "faculties")
    return prisma
      .$transaction(async (tx) => {
        const item = await tx.faculty.update({
          where: { id },
          data: { code: input.code, name: input.name },
        });
        await tx.organizingUnit.updateMany({
          where: { type: "FACULTY", facultyId: id },
          data: { code: `FACULTY:${item.code}` },
        });
        return item;
      })
      .catch(mapCrudError);
  if (kind === "majors") {
    if (!input.facultyId) throw new ApiError(400, "facultyId is required");
    const inUse = await prisma.class.count({
      where: { majorId: id, organizingUnit: { events: { some: {} } } },
    });
    if (
      inUse &&
      (await prisma.major.findUnique({ where: { id }, select: { facultyId: true } }))?.facultyId !==
        input.facultyId
    )
      throw new ApiError(409, "Cannot move a major with classes used by events");
    return prisma
      .$transaction(async (tx) => {
        const item = await tx.major.update({
          where: { id },
          data: { code: input.code, name: input.name, facultyId: input.facultyId! },
          include: { faculty: true },
        });
        await tx.organizingUnit.updateMany({
          where: { type: "CLASS", class: { is: { majorId: id } } },
          data: { facultyId: input.facultyId! },
        });
        return item;
      })
      .catch(mapCrudError);
  }
  if (!input.majorId) throw new ApiError(400, "majorId is required");
  return prisma
    .$transaction(async (tx) => {
      const current = await tx.class.findUnique({
        where: { id },
        include: { organizingUnit: { include: { _count: { select: { events: true } } } } },
      });
      if (!current) throw new ApiError(404, "Class not found");
      const major = await tx.major.findUnique({ where: { id: input.majorId! } });
      if (!major) throw new ApiError(409, "Major does not exist");
      if (current.organizingUnit?._count.events && current.majorId !== input.majorId)
        throw new ApiError(409, "Cannot move a class used by events");
      const item = await tx.class.update({
        where: { id },
        data: { code: input.code, name: input.name, majorId: input.majorId! },
      });
      await tx.organizingUnit.updateMany({
        where: { classId: id },
        data: { code: `CLASS:${item.code}`, facultyId: major.facultyId },
      });
      return item;
    })
    .catch(mapCrudError);
}

export async function remove(kind: AcademicKind, id: string) {
  if (kind === "faculties") {
    const item = await prisma.faculty.findUnique({
      where: { id },
      include: { _count: { select: { majors: true, primaryUsers: true, organizingUnits: true } } },
    });
    if (!item) throw new ApiError(404, "Faculty not found");
    if (item._count.majors || item._count.primaryUsers || item._count.organizingUnits > 1)
      throw new ApiError(409, "Faculty is in use");
    await prisma.$transaction([
      prisma.organizingUnit.deleteMany({ where: { type: "FACULTY", facultyId: id } }),
      prisma.faculty.delete({ where: { id } }),
    ]);
    return;
  }
  if (kind === "majors") {
    const item = await prisma.major.findUnique({
      where: { id },
      include: { _count: { select: { classes: true } } },
    });
    if (!item) throw new ApiError(404, "Major not found");
    if (item._count.classes) throw new ApiError(409, "Major is in use");
    await prisma.major.delete({ where: { id } });
    return;
  }
  const item = await prisma.class.findUnique({
    where: { id },
    include: {
      _count: { select: { students: true } },
      organizingUnit: { include: { _count: { select: { events: true } } } },
    },
  });
  if (!item) throw new ApiError(404, "Class not found");
  if (item._count.students || item.organizingUnit?._count.events)
    throw new ApiError(409, "Class is in use");
  await prisma.$transaction([
    prisma.organizingUnit.deleteMany({ where: { classId: id } }),
    prisma.class.delete({ where: { id } }),
  ]);
}
