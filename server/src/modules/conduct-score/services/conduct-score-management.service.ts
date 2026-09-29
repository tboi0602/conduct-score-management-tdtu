import { randomUUID } from "crypto";
import { Prisma, type Ranking } from "@prisma/client";

import { prisma } from "@config/prisma";
import { invalidateDashboardCache } from "@modules/dashboard";
import { getEventAccess } from "@services/events/event-access.service";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";
export {
  addAdjustment,
  addBulkAdjustment,
} from "@modules/conduct-score/services/conduct-score-adjustment.service";
import {
  assertStudentScope,
  facultyScope,
  studentFacultyWhere,
} from "@modules/conduct-score/services/conduct-score-access.service";
import { scoreSelect } from "@modules/conduct-score/queries/conduct-score-select.query";
export {
  syncEndedEventConductScores,
  syncEventConductScore,
  type EventScoreSyncOptions,
} from "@modules/conduct-score/services/event-score-synchronization.service";
import {
  addDefaultCriterionEntries,
  recalculate,
  recalculateMany,
} from "@modules/conduct-score/queries/conduct-score-projection.queries";
import {
  boundedTotalScore,
  cappedCriterionScore,
  rankingFor,
} from "@modules/conduct-score/services/conduct-score-calculation.service";

export type ConductScoreFilters = {
  semesterId: string;
  search?: string;
  facultyId?: string;
  majorId?: string;
  classId?: string;
  status?: "DRAFT" | "FINAL";
  ranking?: Ranking;
};

const BULK_FINALIZE_LIMIT = 10_000;
const BULK_ADJUSTMENT_LIMIT = 5_000;

function conductScoreStudentWhere(
  facultyId: string | undefined,
  filters: ConductScoreFilters,
): Prisma.StudentWhereInput {
  const search = filters.search?.trim();
  const scoreFilter: Prisma.ConductScoreWhereInput = {
    semesterId: filters.semesterId,
    status: filters.status,
    ranking: filters.ranking,
  };
  return {
    AND: [
      studentFacultyWhere(facultyId),
      filters.facultyId
        ? { class: { is: { major: { is: { facultyId: filters.facultyId } } } } }
        : {},
      filters.majorId ? { class: { is: { majorId: filters.majorId } } } : {},
    ],
    ...(filters.classId ? { classId: filters.classId } : {}),
    ...(search
      ? {
          OR: [
            { studentCode: { contains: search, mode: "insensitive" } },
            { user: { is: { name: { contains: search, mode: "insensitive" } } } },
            { user: { is: { email: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
    ...(filters.status || filters.ranking ? { conductScores: { some: scoreFilter } } : {}),
  };
}

export async function listConductScores(
  userId: string,
  params: PaginationParams,
  filters: ConductScoreFilters,
) {
  const facultyId = await facultyScope(userId);
  const where = conductScoreStudentWhere(facultyId, filters);
  const [total, students] = await prisma.$transaction([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      select: {
        id: true,
        studentCode: true,
        user: { select: { name: true, email: true } },
        class: {
          select: {
            id: true,
            code: true,
            name: true,
            major: { select: { name: true } },
          },
        },
        conductScores: { where: { semesterId: filters.semesterId }, select: scoreSelect, take: 1 },
      },
      orderBy: [{ studentCode: "asc" }, { id: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return {
    items: students.map(({ conductScores, ...student }) => ({
      student: {
        ...student,
        major: student.class?.major.name ?? null,
        class: student.class
          ? { id: student.class.id, code: student.class.code, name: student.class.name }
          : null,
      },
      score: conductScores[0] ?? null,
    })),
    pagination: createPaginationMeta(total, params),
  };
}

export async function bulkFinalizeConductScores(
  userId: string,
  filters: ConductScoreFilters,
  studentIds?: string[],
) {
  const facultyId = await facultyScope(userId);
  const semester = await prisma.semester.findUnique({
    where: { id: filters.semesterId },
    select: { id: true },
  });
  if (!semester) throw new ApiError(400, "Semester does not exist");
  const where: Prisma.StudentWhereInput = studentIds
    ? { ...studentFacultyWhere(facultyId), id: { in: studentIds } }
    : conductScoreStudentWhere(facultyId, filters);
  const students = await prisma.student.findMany({
    where,
    select: { id: true },
    orderBy: { id: "asc" },
    take: BULK_FINALIZE_LIMIT + 1,
  });
  if (students.length > BULK_FINALIZE_LIMIT) {
    throw new ApiError(400, "Narrow the filters to at most 10000 students per operation");
  }
  const ids = students.map((student) => student.id);
  if (!ids.length) return { matched: 0, finalized: 0, alreadyFinal: 0 };

  const now = new Date();
  const finalized = await prisma.$transaction(
    async (tx) => {
      await tx.conductScore.createMany({
        data: ids.map((studentId) => ({ studentId, semesterId: filters.semesterId })),
        skipDuplicates: true,
      });
      const drafts = await tx.conductScore.findMany({
        where: { semesterId: filters.semesterId, studentId: { in: ids }, status: "DRAFT" },
        select: { id: true },
        orderBy: { id: "asc" },
      });
      if (!drafts.length) return 0;
      const draftIds = drafts.map((score) => score.id);
      await addDefaultCriterionEntries(tx, draftIds, userId);
      await recalculateMany(tx, draftIds);
      const updated = await tx.conductScore.updateMany({
        where: { id: { in: draftIds }, status: "DRAFT" },
        data: { status: "FINAL", finalizedAt: now, finalizedByUserId: userId },
      });
      if (!updated.count) return 0;
      if (updated.count !== draftIds.length) {
        throw new ApiError(409, "Conduct scores changed concurrently; retry the operation");
      }
      await tx.conductScoreStatusHistory.createMany({
        data: draftIds.map((conductScoreId) => ({
          conductScoreId,
          action: "FINALIZED" as const,
          actorUserId: userId,
        })),
      });
      return updated.count;
    },
    { maxWait: 5_000, timeout: 60_000 },
  );
  await invalidateDashboardCache(facultyId);
  return { matched: ids.length, finalized, alreadyFinal: ids.length - finalized };
}

async function detailedScore(studentId: string, semesterId: string) {
  const [student, criteriaCatalog] = await prisma.$transaction([
    prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentCode: true,
        user: { select: { name: true, email: true } },
        class: {
          select: {
            id: true,
            code: true,
            name: true,
            major: {
              select: {
                id: true,
                code: true,
                name: true,
                faculty: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
        conductScores: {
          where: { semesterId },
          select: {
            ...scoreSelect,
            semester: { select: { id: true, year: true, type: true } },
            finalizedBy: { select: { id: true, name: true } },
            entries: {
              select: {
                id: true,
                points: true,
                source: true,
                reason: true,
                result: true,
                createdAt: true,
                reversalOfId: true,
                criteria: {
                  select: { id: true, title: true, maxPoints: true, defaultPoints: true },
                },
                event: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
              },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            },
            statusHistory: {
              select: {
                id: true,
                action: true,
                reason: true,
                createdAt: true,
                actor: { select: { id: true, name: true } },
              },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            },
          },
          take: 1,
        },
      },
    }),
    prisma.criteria.findMany({
      select: { id: true, title: true, maxPoints: true, defaultPoints: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);
  if (!student) throw new ApiError(404, "Student not found");
  const { conductScores, ...profile } = student;
  return {
    student: { ...profile, major: profile.class?.major.name ?? null },
    score: conductScores[0] ?? null,
    criteriaCatalog,
  };
}

export async function getConductScore(userId: string, studentId: string, semesterId: string) {
  await assertStudentScope(userId, studentId);
  return detailedScore(studentId, semesterId);
}

export async function getMyConductScore(userId: string, semesterId: string) {
  const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) throw new ApiError(409, "Student profile is required");
  return detailedScore(student.id, semesterId);
}

export async function changeFinalization(
  userId: string,
  studentId: string,
  semesterId: string,
  action: "FINALIZED" | "REOPENED",
  reason?: string,
) {
  const { facultyId } = await assertStudentScope(userId, studentId);
  const score = await prisma.$transaction(async (tx) => {
    const current = await tx.conductScore.findUnique({
      where: { studentId_semesterId: { studentId, semesterId } },
    });
    if (!current) throw new ApiError(404, "Conduct score has not been created");
    if (action === "FINALIZED" && current.status === "FINAL")
      throw new ApiError(409, "Conduct score is already finalized");
    if (action === "REOPENED" && current.status === "DRAFT")
      throw new ApiError(409, "Conduct score is already a draft");
    if (action === "FINALIZED") {
      await addDefaultCriterionEntries(tx, [current.id], userId);
      await recalculate(tx, current.id);
    }
    await tx.conductScoreStatusHistory.create({
      data: { conductScoreId: current.id, action, reason, actorUserId: userId },
    });
    return tx.conductScore.update({
      where: { id: current.id },
      data:
        action === "FINALIZED"
          ? { status: "FINAL", finalizedAt: new Date(), finalizedByUserId: userId }
          : { status: "DRAFT", finalizedAt: null, finalizedByUserId: null },
      select: scoreSelect,
    });
  });
  await invalidateDashboardCache(facultyId);
  return score;
}
