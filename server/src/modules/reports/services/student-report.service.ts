import { Ranking, Prisma } from "@prisma/client";

import { prisma } from "@config/prisma";
import { getEventAccess } from "@services/events/event-access.service";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";

const rankings = Object.values(Ranking);

export async function getStudentReport(
  actorId: string,
  requestedSemesterId: string | undefined,
  filters: {
    facultyId?: string;
    classId?: string;
    majorId?: string;
    ranking?: string;
    search?: string;
  },
  pagination: PaginationParams,
) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { userRoles: { select: { role: { select: { name: true } } } } },
  });
  if (!actor) throw new ApiError(401, "User not found");
  const isAdmin = actor.userRoles.some(({ role }) => role.name === "ADMIN");
  const access = await getEventAccess(actorId);
  const canReport =
    isAdmin ||
    access.manageAnyUnit ||
    actor.userRoles.some(({ role }) => ["STUDENT_AFFAIRS", "EVENT_ORGANIZER"].includes(role.name));
  if (!canReport) throw new ApiError(403, "Student report access denied");

  const canManageAllFaculties = isAdmin || access.manageAnyUnit;
  if (!canManageAllFaculties && !access.facultyId) {
    throw new ApiError(409, "A primary faculty must be assigned");
  }

  // Determine active faculty scope
  const targetFacultyId = canManageAllFaculties
    ? filters.facultyId || undefined
    : access.facultyId!;

  const semester = requestedSemesterId
    ? await prisma.semester.findUnique({
        where: { id: requestedSemesterId },
        select: { id: true, year: true, type: true },
      })
    : await prisma.semester.findFirst({
        orderBy: [{ year: "desc" }, { type: "asc" }],
        select: { id: true, year: true, type: true },
      });
  if (!semester) throw new ApiError(404, "Semester not found");
  const semesterId = semester.id;

  const classFilter: Prisma.ClassWhereInput = {
    ...(targetFacultyId || filters.majorId
      ? {
          major: {
            ...(targetFacultyId ? { facultyId: targetFacultyId } : {}),
            ...(filters.majorId ? { id: filters.majorId } : {}),
          },
        }
      : {}),
    ...(filters.classId ? { id: filters.classId } : {}),
  };
  if (
    filters.ranking &&
    filters.ranking !== "UNRATED" &&
    !rankings.includes(filters.ranking as Ranking)
  )
    throw new ApiError(400, "Invalid ranking filter");

  const where: Prisma.StudentWhereInput = {
    class: classFilter,
    ...(filters.search
      ? {
          OR: [
            { studentCode: { contains: filters.search, mode: "insensitive" } },
            { user: { name: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(filters.ranking === "UNRATED"
      ? { conductScores: { none: { semesterId } } }
      : filters.ranking
        ? { conductScores: { some: { semesterId, ranking: filters.ranking as Ranking } } }
        : {}),
  };
  const [total, students] = await prisma.$transaction([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      select: {
        id: true,
        studentCode: true,
        user: { select: { name: true } },
        class: {
          select: {
            id: true,
            code: true,
            major: {
              select: {
                id: true,
                name: true,
                faculty: { select: { id: true, name: true } },
              },
            },
          },
        },
        conductScores: {
          where: { semesterId },
          select: { totalScore: true, ranking: true },
          take: 1,
        },
      },
      orderBy: [{ studentCode: "asc" }, { id: "asc" }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
  ]);

  const [semesters, faculties, majors, classes] = await Promise.all([
    prisma.semester.findMany({
      select: { id: true, year: true, type: true },
      orderBy: [{ year: "desc" }, { type: "asc" }],
    }),
    canManageAllFaculties
      ? prisma.faculty.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.major.findMany({
      where: targetFacultyId ? { facultyId: targetFacultyId } : undefined,
      select: { id: true, name: true, facultyId: true },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      where: {
        major: {
          ...(targetFacultyId ? { facultyId: targetFacultyId } : {}),
          ...(filters.majorId ? { id: filters.majorId } : {}),
        },
      },
      select: { id: true, code: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return {
    semester,
    canManageAllFaculties,
    items: students.map((student) => {
      const score = student.conductScores[0];
      return {
        id: student.id,
        studentCode: student.studentCode,
        name: student.user.name,
        facultyName: student.class?.major.faculty.name ?? "—",
        classId: student.class?.id ?? null,
        classCode: student.class?.code ?? "—",
        majorId: student.class?.major.id ?? null,
        majorName: student.class?.major.name ?? "—",
        totalScore: score?.totalScore ?? null,
        ranking: score?.ranking ?? null,
      };
    }),
    pagination: createPaginationMeta(total, pagination),
    options: {
      semesters,
      faculties,
      majors,
      classes,
    },
  };
}
