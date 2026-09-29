import {
  AttendanceFailureCategory,
  AttendanceAppealStatus,
  Prisma,
  type AttendanceDirection,
} from "@prisma/client";

import { prisma } from "@config/prisma";
import { eventScope, type EventAccess } from "@services/events/event-access.service";
import { syncEventConductScore } from "@modules/conduct-score";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";
import { ApiError } from "@utils/ApiError";
import { evidenceUrl, verifyEvidence } from "./evidence.service";

const eventView = {
  id: true,
  name: true,
  timeStart: true,
  timeEnd: true,
  checkInMode: true,
  points: true,
  organizer: { select: { id: true, name: true, code: true } },
} satisfies Prisma.EventSelect;

const appealView = {
  id: true,
  attemptNumber: true,
  target: true,
  failureCategory: true,
  failedAt: true,
  status: true,
  explanation: true,
  reviewNote: true,
  reviewedAt: true,
  evidenceName: true,
  evidenceMime: true,
  evidenceSize: true,
  createdAt: true,
  event: { select: eventView },
  student: {
    select: {
      id: true,
      studentCode: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  reviewedBy: { select: { id: true, name: true } },
} satisfies Prisma.AttendanceAppealSelect;

async function studentFor(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true, userId: true },
  });
  if (!student) throw new ApiError(409, "Student profile is required");
  return student;
}

export async function eligibleEvents(userId: string) {
  const student = await studentFor(userId);
  const now = new Date();
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return prisma.event.findMany({
    where: {
      timeEnd: { lte: now, gte: cutoff },
      registrations: { some: { studentId: student.id, status: "REGISTERED" } },
      attendanceAppealAttempts: { none: { studentId: student.id, totalCount: { gte: 3 } } },
      attendanceAppeals: { none: { studentId: student.id, status: "PENDING" } },
      OR: [
        {
          checkInMode: "ONE_WAY",
          attendanceRecords: {
            none: {
              studentId: student.id,
              direction: "CHECK_IN",
              status: { in: ["ATTENDED", "LATE"] },
            },
          },
        },
        {
          checkInMode: "TWO_WAY",
          AND: [
            {
              OR: [
                {
                  attendanceRecords: {
                    none: {
                      studentId: student.id,
                      direction: "CHECK_IN",
                      status: { in: ["ATTENDED", "LATE"] },
                    },
                  },
                },
                {
                  attendanceRecords: {
                    none: {
                      studentId: student.id,
                      direction: "CHECK_OUT",
                      status: { in: ["ATTENDED", "LATE"] },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    select: eventView,
    orderBy: { timeEnd: "desc" },
  });
}

export async function listMine(userId: string, params: PaginationParams) {
  const student = await studentFor(userId);
  const where = { studentId: student.id };
  const [total, items] = await prisma.$transaction([
    prisma.attendanceAppeal.count({ where }),
    prisma.attendanceAppeal.findMany({
      where,
      select: appealView,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return { items, pagination: createPaginationMeta(total, params) };
}

export type CreateAppealInput = {
  eventId: string;
  explanation: string;
  failureCategory?: AttendanceFailureCategory;
  failedAt?: Date;
  evidenceKey: string;
  evidenceName: string;
  evidenceMime: string;
  evidenceSize: number;
};

export async function createAppeal(userId: string, input: CreateAppealInput) {
  const student = await studentFor(userId);
  await verifyEvidence(userId, input.evidenceKey, input.evidenceMime, input.evidenceSize);
  const now = new Date();
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const event = await prisma.event.findFirst({
    where: {
      id: input.eventId,
      timeEnd: { lte: now, gte: cutoff },
      registrations: { some: { studentId: student.id, status: "REGISTERED" } },
    },
    select: {
      id: true,
      checkInMode: true,
      attendanceRecords: {
        where: { studentId: student.id, status: { in: ["ATTENDED", "LATE"] } },
        select: { direction: true },
      },
    },
  });
  if (!event) throw new ApiError(409, "Event is not eligible for an attendance appeal");
  const completedDirections = new Set(event.attendanceRecords.map((item) => item.direction));
  const attendanceComplete =
    completedDirections.has("CHECK_IN") &&
    (event.checkInMode === "ONE_WAY" || completedDirections.has("CHECK_OUT"));
  if (attendanceComplete) throw new ApiError(409, "Attendance is already complete for this event");
  try {
    return await prisma.$transaction(
      async (tx) => {
        const pending = await tx.attendanceAppeal.findFirst({
          where: { studentId: student.id, eventId: event.id, status: "PENDING" },
          select: { id: true },
        });
        if (pending) throw new ApiError(409, "An appeal is already pending for this event");
        const current = await tx.attendanceAppealAttempt.findUnique({
          where: { studentId_eventId: { studentId: student.id, eventId: event.id } },
          select: { totalCount: true },
        });
        const attemptNumber = (current?.totalCount ?? 0) + 1;
        if (attemptNumber > 3) throw new ApiError(409, "Appeal limit reached for this event");
        await tx.attendanceAppealAttempt.upsert({
          where: { studentId_eventId: { studentId: student.id, eventId: event.id } },
          update: { totalCount: attemptNumber },
          create: { studentId: student.id, eventId: event.id, totalCount: attemptNumber },
        });
        return tx.attendanceAppeal.create({
          data: { ...input, studentId: student.id, attemptNumber },
          select: appealView,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(409, "Appeal or evidence has already been submitted");
    }
    throw error;
  }
}

export async function listManaged(
  access: EventAccess,
  params: PaginationParams,
  status?: AttendanceAppealStatus,
  search?: string,
) {
  const where: Prisma.AttendanceAppealWhereInput = {
    status,
    event: eventScope(access),
    OR: search
      ? [
          { event: { name: { contains: search, mode: "insensitive" } } },
          { student: { studentCode: { contains: search, mode: "insensitive" } } },
          { student: { user: { name: { contains: search, mode: "insensitive" } } } },
        ]
      : undefined,
  };
  const [total, items] = await prisma.$transaction([
    prisma.attendanceAppeal.count({ where }),
    prisma.attendanceAppeal.findMany({
      where,
      select: appealView,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return { items, pagination: createPaginationMeta(total, params) };
}

async function scopedAppeal(id: string, access: EventAccess) {
  const appeal = await prisma.attendanceAppeal.findFirst({
    where: { id, event: eventScope(access) },
    select: { ...appealView, evidenceKey: true, studentId: true, eventId: true },
  });
  if (!appeal) throw new ApiError(404, "Appeal not found");
  return appeal;
}

export async function managedDetail(id: string, access: EventAccess) {
  return scopedAppeal(id, access);
}

export async function ownEvidence(id: string, userId: string) {
  const item = await prisma.attendanceAppeal.findFirst({
    where: { id, student: { userId } },
    select: { evidenceKey: true },
  });
  if (!item) throw new ApiError(404, "Appeal not found");
  return evidenceUrl(item.evidenceKey);
}

export async function managedEvidence(id: string, access: EventAccess) {
  const item = await scopedAppeal(id, access);
  return evidenceUrl(item.evidenceKey);
}

export async function reviewAppeal(
  id: string,
  access: EventAccess,
  decision: "APPROVED" | "REJECTED",
  reviewNote?: string,
) {
  const current = await scopedAppeal(id, access);
  if (current.status !== "PENDING") throw new ApiError(409, "Appeal has already been reviewed");
  if (decision === "REJECTED" && !reviewNote?.trim()) {
    throw new ApiError(400, "A rejection reason is required");
  }
  const reviewedAt = new Date();
  const directions: AttendanceDirection[] =
    current.event.checkInMode === "TWO_WAY" ? ["CHECK_IN", "CHECK_OUT"] : ["CHECK_IN"];
  await prisma.$transaction(async (tx) => {
    const updated = await tx.attendanceAppeal.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: decision,
        reviewNote: reviewNote?.trim() || null,
        reviewedByUserId: access.userId,
        reviewedAt,
      },
    });
    if (!updated.count) throw new ApiError(409, "Appeal has already been reviewed");
    if (decision === "APPROVED") {
      for (const direction of directions) {
        const existing = await tx.attendanceRecord.findUnique({
          where: {
            studentId_eventId_direction: {
              studentId: current.studentId,
              eventId: current.eventId,
              direction,
            },
          },
          select: { id: true, status: true },
        });
        const timeChecking =
          direction === "CHECK_IN" ? current.event.timeStart : current.event.timeEnd;
        if (existing && existing.status !== "ATTENDED" && existing.status !== "LATE") {
          await tx.attendanceRecord.update({
            where: { id: existing.id },
            data: { status: "ATTENDED" },
          });
        } else if (!existing) {
          await tx.attendanceRecord.create({
            data: {
              studentId: current.studentId,
              eventId: current.eventId,
              direction,
              status: "ATTENDED",
              timeChecking,
              pointsEarned:
                current.event.checkInMode === "ONE_WAY" && direction === "CHECK_IN"
                  ? current.event.points
                  : 0,
            },
          });
        }
      }
      await tx.userNotification.create({
        data: {
          userId: current.student.user.id,
          type: "APPEAL_APPROVED",
          title: current.event.name,
          message: "",
          entityId: current.id,
        },
      });
    } else {
      await tx.userNotification.create({
        data: {
          userId: current.student.user.id,
          type: "APPEAL_REJECTED",
          title: current.event.name,
          message: reviewNote?.trim() ?? "",
          entityId: current.id,
        },
      });
    }
  });
  if (decision === "APPROVED") {
    await syncEventConductScore(current.studentId, current.eventId, {
      allowFinalized: true,
      reason: `Attendance restored after approved appeal ${id}`,
    });
  }
  return managedDetail(id, access);
}
