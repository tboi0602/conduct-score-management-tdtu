import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@config/prisma";
import { scoreSelect } from "@modules/conduct-score/queries/conduct-score-select.query";
import {
  recalculate,
  recalculateMany,
} from "@modules/conduct-score/queries/conduct-score-projection.queries";
import {
  assertStudentScope,
  facultyScope,
  studentFacultyWhere,
} from "@modules/conduct-score/services/conduct-score-access.service";
import { invalidateDashboardCache } from "@modules/dashboard";
import { ApiError } from "@utils/ApiError";

const BULK_ADJUSTMENT_LIMIT = 5_000;
export async function addAdjustment(
  userId: string,
  studentId: string,
  input: {
    semesterId: string;
    criteriaId: string;
    points: number;
    reason: string;
    result: string;
  },
) {
  const { facultyId } = await assertStudentScope(userId, studentId);
  const updated = await prisma.$transaction(async (tx) => {
    const criteria = await tx.criteria.findUnique({
      where: { id: input.criteriaId },
      select: { id: true },
    });
    if (!criteria) throw new ApiError(400, "Criteria does not exist");
    const semester = await tx.semester.findUnique({
      where: { id: input.semesterId },
      select: { id: true },
    });
    if (!semester) throw new ApiError(400, "Semester does not exist");
    const score = await tx.conductScore.upsert({
      where: { studentId_semesterId: { studentId, semesterId: input.semesterId } },
      update: {},
      create: { studentId, semesterId: input.semesterId },
    });
    if (score.status === "FINAL")
      throw new ApiError(409, "Finalized conduct score must be reopened first");
    await tx.conductScoreEntry.create({
      data: {
        conductScoreId: score.id,
        criteriaId: input.criteriaId,
        points: input.points,
        result: input.result,
        source: "MANUAL_ADJUSTMENT",
        reason: input.reason,
        createdByUserId: userId,
        idempotencyKey: `manual:${randomUUID()}`,
      },
    });
    await recalculate(tx, score.id);
    return tx.conductScore.findUniqueOrThrow({ where: { id: score.id }, select: scoreSelect });
  });
  await invalidateDashboardCache(facultyId);
  return updated;
}

export async function addBulkAdjustment(
  userId: string,
  input: {
    operationId: string;
    semesterId: string;
    criteriaId: string;
    reason: string;
    result: string;
    studentCodes: string[];
  },
) {
  if (input.studentCodes.length > BULK_ADJUSTMENT_LIMIT) {
    throw new ApiError(400, `A bulk adjustment supports at most ${BULK_ADJUSTMENT_LIMIT} students`);
  }
  const facultyId = await facultyScope(userId);
  const [criterion, semester, students] = await prisma.$transaction([
    prisma.criteria.findUnique({
      where: { id: input.criteriaId },
      select: { id: true, maxPoints: true, defaultPoints: true },
    }),
    prisma.semester.findUnique({ where: { id: input.semesterId }, select: { id: true } }),
    prisma.student.findMany({
      where: {
        studentCode: { in: input.studentCodes },
        ...studentFacultyWhere(facultyId),
      },
      select: { id: true, studentCode: true },
      orderBy: { id: "asc" },
    }),
  ]);
  if (!criterion) throw new ApiError(400, "Criteria does not exist");
  if (!semester) throw new ApiError(400, "Semester does not exist");

  const foundCodes = new Set(students.map((student) => student.studentCode));
  const notFoundCodes = input.studentCodes.filter((code) => !foundCodes.has(code));
  if (!students.length) {
    return { requested: input.studentCodes.length, applied: 0, skippedFinalized: 0, notFoundCodes };
  }

  const result = await prisma.$transaction(
    async (tx) => {
      await tx.conductScore.createMany({
        data: students.map((student) => ({
          studentId: student.id,
          semesterId: input.semesterId,
        })),
        skipDuplicates: true,
      });
      const scores = await tx.conductScore.findMany({
        where: {
          semesterId: input.semesterId,
          studentId: { in: students.map((student) => student.id) },
        },
        select: { id: true, status: true },
        orderBy: { id: "asc" },
      });
      const draftScoreIds = scores
        .filter((score) => score.status === "DRAFT")
        .map((score) => score.id);
      const skippedFinalized = scores.length - draftScoreIds.length;
      if (!draftScoreIds.length) return { applied: 0, skippedFinalized };

      const inserted = await tx.conductScoreEntry.createMany({
        data: draftScoreIds.map((conductScoreId) => ({
          conductScoreId,
          criteriaId: input.criteriaId,
          points: criterion.defaultPoints,
          result: input.result,
          source: "MANUAL_ADJUSTMENT" as const,
          reason: input.reason,
          createdByUserId: userId,
          idempotencyKey: `bulk:${input.operationId}:score:${conductScoreId}`,
        })),
        skipDuplicates: true,
      });
      if (!inserted.count) return { applied: 0, skippedFinalized };

      await recalculateMany(tx, draftScoreIds);
      return { applied: inserted.count, skippedFinalized };
    },
    { maxWait: 5_000, timeout: 30_000 },
  );
  await invalidateDashboardCache(facultyId);
  return {
    requested: input.studentCodes.length,
    applied: result.applied,
    skippedFinalized: result.skippedFinalized,
    notFoundCodes,
  };
}
