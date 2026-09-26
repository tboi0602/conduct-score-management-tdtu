import { Prisma, type ScheduleExceptionStatus } from "@prisma/client";

import { prisma } from "@config/prisma";
import { ApiError } from "@utils/ApiError";

export type ScheduleSlotInput = { dayOfWeek: number; classSessionId: string };
export type ScheduleExceptionInput = {
  date: string;
  classSessionId: string;
  status: ScheduleExceptionStatus;
};

const sessionSelect = {
  id: true,
  name: true,
  startTime: true,
  endTime: true,
} satisfies Prisma.ClassSessionSelect;

const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
const parseDateOnly = (value: string, field: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(400, `${field} must be YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || dateOnly(date) !== value)
    throw new ApiError(400, `${field} is invalid`);
  return date;
};

function todayInVietnam(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function context(userId: string, semesterId: string) {
  const [student, semester, sessions] = await Promise.all([
    prisma.student.findUnique({ where: { userId }, select: { id: true } }),
    prisma.semester.findUnique({
      where: { id: semesterId },
      select: { id: true, year: true, type: true, startDate: true, endDate: true },
    }),
    prisma.classSession.findMany({ select: sessionSelect, orderBy: { startTime: "asc" } }),
  ]);
  if (!student) throw new ApiError(409, "Student profile is required");
  if (!semester) throw new ApiError(404, "Semester not found");
  return { student, semester, sessions };
}

export async function getMySchedule(userId: string, semesterId: string) {
  const { student, semester, sessions } = await context(userId, semesterId);
  const slots = await prisma.schedule.findMany({
    where: { studentId: student.id, semesterId },
    select: { id: true, dayOfWeek: true, classSessionId: true },
    orderBy: [{ dayOfWeek: "asc" }, { classSession: { startTime: "asc" } }],
  });
  return { semester, sessions, slots };
}

export async function replaceMySchedule(
  userId: string,
  semesterId: string,
  slots: ScheduleSlotInput[],
) {
  const { student, sessions } = await context(userId, semesterId);
  const sessionIds = new Set(sessions.map(({ id }) => id));
  const unique = new Map<string, ScheduleSlotInput>();
  for (const slot of slots) {
    if (slot.dayOfWeek < 2 || slot.dayOfWeek > 8)
      throw new ApiError(400, "dayOfWeek must be between 2 and 8");
    if (!sessionIds.has(slot.classSessionId)) throw new ApiError(400, "classSessionId is invalid");
    unique.set(`${slot.dayOfWeek}:${slot.classSessionId}`, slot);
  }
  await prisma.$transaction(async (tx) => {
    await tx.schedule.deleteMany({ where: { studentId: student.id, semesterId } });
    if (unique.size) {
      await tx.schedule.createMany({
        data: [...unique.values()].map((slot) => ({ ...slot, studentId: student.id, semesterId })),
      });
    }
    const exceptions = await tx.scheduleException.findMany({
      where: { studentId: student.id, semesterId },
      select: { id: true, date: true, classSessionId: true, status: true },
    });
    const defaultKeys = new Set(
      [...unique.values()].map((slot) => `${slot.dayOfWeek}:${slot.classSessionId}`),
    );
    const redundantIds = exceptions
      .filter((item) => {
        const jsDay = item.date.getUTCDay();
        const dayOfWeek = jsDay === 0 ? 8 : jsDay + 1;
        const hasDefault = defaultKeys.has(`${dayOfWeek}:${item.classSessionId}`);
        return (item.status === "HAS_CLASS") === hasDefault;
      })
      .map(({ id }) => id);
    if (redundantIds.length) {
      await tx.scheduleException.deleteMany({ where: { id: { in: redundantIds } } });
    }
  });
  return getMySchedule(userId, semesterId);
}

export async function getMyWeek(userId: string, semesterId: string, weekStartValue: string) {
  const { student, semester, sessions } = await context(userId, semesterId);
  const weekStart = parseDateOnly(weekStartValue, "weekStart");
  if (weekStart.getUTCDay() !== 1) throw new ApiError(400, "weekStart must be a Monday");
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const [slots, exceptions] = await Promise.all([
    prisma.schedule.findMany({
      where: { studentId: student.id, semesterId },
      select: { dayOfWeek: true, classSessionId: true },
    }),
    prisma.scheduleException.findMany({
      where: { studentId: student.id, semesterId, date: { gte: weekStart, lte: weekEnd } },
      select: { id: true, date: true, classSessionId: true, status: true },
      orderBy: [{ date: "asc" }, { classSession: { startTime: "asc" } }],
    }),
  ]);
  return {
    semester,
    sessions,
    slots,
    weekStart: dateOnly(weekStart),
    today: todayInVietnam(),
    exceptions: exceptions.map((item) => ({ ...item, date: dateOnly(item.date) })),
  };
}

export async function replaceMyWeek(
  userId: string,
  semesterId: string,
  weekStartValue: string,
  exceptions: ScheduleExceptionInput[],
) {
  const { student, semester, sessions } = await context(userId, semesterId);
  const weekStart = parseDateOnly(weekStartValue, "weekStart");
  if (weekStart.getUTCDay() !== 1) throw new ApiError(400, "weekStart must be a Monday");
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const minDate = dateOnly(semester.startDate);
  const maxDate = dateOnly(semester.endDate);
  const today = todayInVietnam();
  const sessionIds = new Set(sessions.map(({ id }) => id));
  const defaults = await prisma.schedule.findMany({
    where: { studentId: student.id, semesterId },
    select: { dayOfWeek: true, classSessionId: true },
  });
  const defaultKeys = new Set(defaults.map((slot) => `${slot.dayOfWeek}:${slot.classSessionId}`));
  const unique = new Map<
    string,
    { date: Date; classSessionId: string; status: ScheduleExceptionStatus }
  >();
  for (const exception of exceptions) {
    const date = parseDateOnly(exception.date, "date");
    if (date < weekStart || date > weekEnd)
      throw new ApiError(400, "Exception date must be in the selected week");
    if (exception.date < today || exception.date < minDate || exception.date > maxDate)
      throw new ApiError(400, "Exception date cannot be edited");
    if (!sessionIds.has(exception.classSessionId))
      throw new ApiError(400, "classSessionId is invalid");
    const dayOfWeek = date.getUTCDay() === 0 ? 8 : date.getUTCDay() + 1;
    const hasDefault = defaultKeys.has(`${dayOfWeek}:${exception.classSessionId}`);
    if ((exception.status === "HAS_CLASS") === hasDefault)
      throw new ApiError(400, "Exception must change the default schedule");
    unique.set(`${exception.date}:${exception.classSessionId}`, {
      date,
      classSessionId: exception.classSessionId,
      status: exception.status,
    });
  }
  await prisma.$transaction(async (tx) => {
    await tx.scheduleException.deleteMany({
      where: { studentId: student.id, semesterId, date: { gte: weekStart, lte: weekEnd } },
    });
    if (unique.size) {
      await tx.scheduleException.createMany({
        data: [...unique.values()].map((item) => ({ ...item, studentId: student.id, semesterId })),
      });
    }
  });
  return getMyWeek(userId, semesterId, weekStartValue);
}
