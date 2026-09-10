import { prisma } from "@config/prisma";
import { redisClient } from "@redis";
import { getEventAccess } from "@services/event-access.service";
import { ApiError } from "@utils/ApiError";

type FacultyStatistic = {
  id: string;
  code: string;
  name: string;
  students: bigint;
  events: bigint;
  registrations: bigint;
  attendanceRecords: bigint;
  absences: bigint;
};

type ParticipationStatistic = { attended: bigint; absences: bigint };

const serialize = (_key: string, value: unknown) => typeof value === "bigint" ? Number(value) : value;

export async function invalidateDashboardCache(facultyId?: string | null): Promise<void> {
  const keys = ["dashboard:global"];
  if (facultyId) keys.push(`dashboard:faculty:${facultyId}`);
  const versions = ["dashboard:version:global"];
  if (facultyId) versions.push(`dashboard:version:faculty:${facultyId}`);
  await Promise.all([
    redisClient.getClient().del(...keys),
    ...versions.map((key) => redisClient.getClient().incr(key)),
  ]).catch(() => undefined);
}

export async function getDashboard(userId: string) {
  const access = await getEventAccess(userId);
  if (!access.manageAnyUnit && !access.facultyId) throw new ApiError(409, "A primary faculty must be assigned");
  const scope = access.manageAnyUnit ? "global" : `faculty:${access.facultyId}`;
  const cacheKey = `dashboard:${scope}`;
  const cached = await redisClient.getClient().get(cacheKey);
  if (cached) return JSON.parse(cached) as unknown;
  const facultyId = access.manageAnyUnit ? undefined : access.facultyId ?? undefined;
  const eventWhere = facultyId ? { organizer: { facultyId } } : {};
  const studentWhere = facultyId ? { class: { major: { facultyId } } } : {};
  const now = new Date();
  const [students, faculties, upcoming, ongoing, completed, registrations, participation] = await prisma.$transaction([
    prisma.student.count({ where: studentWhere }),
    prisma.faculty.count({ where: facultyId ? { id: facultyId } : {} }),
    prisma.event.count({ where: { ...eventWhere, timeStart: { gt: now } } }),
    prisma.event.count({ where: { ...eventWhere, timeStart: { lte: now }, timeEnd: { gte: now } } }),
    prisma.event.count({ where: { ...eventWhere, timeEnd: { lt: now } } }),
    prisma.eventRegistration.count({ where: { status: "REGISTERED", event: eventWhere } }),
    prisma.$queryRaw<ParticipationStatistic[]>`
      SELECT
        COUNT(*) FILTER (WHERE
          (e."checkInMode" = 'ONE_WAY' AND EXISTS (
            SELECT 1 FROM "attendance_records" ar
            WHERE ar."eventId" = er."eventId" AND ar."studentId" = er."studentId"
              AND ar."direction" = 'CHECK_IN' AND ar."status" IN ('ATTENDED', 'LATE')
          )) OR
          (e."checkInMode" = 'TWO_WAY' AND EXISTS (
            SELECT 1 FROM "attendance_records" ar
            WHERE ar."eventId" = er."eventId" AND ar."studentId" = er."studentId"
              AND ar."direction" = 'CHECK_IN' AND ar."status" IN ('ATTENDED', 'LATE')
          ) AND EXISTS (
            SELECT 1 FROM "attendance_records" ar
            WHERE ar."eventId" = er."eventId" AND ar."studentId" = er."studentId"
              AND ar."direction" = 'CHECK_OUT' AND ar."status" IN ('ATTENDED', 'LATE')
          ))
        ) AS "attended",
        COUNT(*) FILTER (WHERE NOT (
          (e."checkInMode" = 'ONE_WAY' AND EXISTS (
            SELECT 1 FROM "attendance_records" ar
            WHERE ar."eventId" = er."eventId" AND ar."studentId" = er."studentId"
              AND ar."direction" = 'CHECK_IN' AND ar."status" IN ('ATTENDED', 'LATE')
          )) OR
          (e."checkInMode" = 'TWO_WAY' AND EXISTS (
            SELECT 1 FROM "attendance_records" ar
            WHERE ar."eventId" = er."eventId" AND ar."studentId" = er."studentId"
              AND ar."direction" = 'CHECK_IN' AND ar."status" IN ('ATTENDED', 'LATE')
          ) AND EXISTS (
            SELECT 1 FROM "attendance_records" ar
            WHERE ar."eventId" = er."eventId" AND ar."studentId" = er."studentId"
              AND ar."direction" = 'CHECK_OUT' AND ar."status" IN ('ATTENDED', 'LATE')
          ))
        )) AS "absences"
      FROM "event_registrations" er
      JOIN "events" e ON e."id" = er."eventId"
      LEFT JOIN "organizing_units" ou ON ou."id" = e."organizerId"
      WHERE er."status" = 'REGISTERED' AND e."timeEnd" < NOW()
        AND (${facultyId ?? null}::uuid IS NULL OR ou."facultyId" = ${facultyId ?? null}::uuid)
    `,
  ]);
  const facultyStats = await prisma.$queryRaw<FacultyStatistic[]>`
    SELECT f."id", f."code", f."name",
      (SELECT COUNT(*) FROM "students" s JOIN "classes" c ON c."id" = s."classId" JOIN "majors" m ON m."id" = c."majorId" WHERE m."facultyId" = f."id") AS "students",
      (SELECT COUNT(*) FROM "events" e JOIN "organizing_units" ou ON ou."id" = e."organizerId" WHERE ou."facultyId" = f."id") AS "events",
      (SELECT COUNT(*) FROM "event_registrations" er JOIN "events" e ON e."id" = er."eventId" JOIN "organizing_units" ou ON ou."id" = e."organizerId" WHERE ou."facultyId" = f."id" AND er."status" = 'REGISTERED') AS "registrations",
      (SELECT COUNT(*) FROM "event_registrations" er JOIN "events" e ON e."id" = er."eventId" JOIN "organizing_units" ou ON ou."id" = e."organizerId"
        WHERE ou."facultyId" = f."id" AND er."status" = 'REGISTERED' AND e."timeEnd" < NOW() AND (
          (e."checkInMode" = 'ONE_WAY' AND EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."eventId" = er."eventId" AND ar."studentId" = er."studentId" AND ar."direction" = 'CHECK_IN' AND ar."status" IN ('ATTENDED', 'LATE'))) OR
          (e."checkInMode" = 'TWO_WAY' AND EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."eventId" = er."eventId" AND ar."studentId" = er."studentId" AND ar."direction" = 'CHECK_IN' AND ar."status" IN ('ATTENDED', 'LATE')) AND EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."eventId" = er."eventId" AND ar."studentId" = er."studentId" AND ar."direction" = 'CHECK_OUT' AND ar."status" IN ('ATTENDED', 'LATE')))
        )) AS "attendanceRecords",
      (SELECT COUNT(*) FROM "event_registrations" er JOIN "events" e ON e."id" = er."eventId" JOIN "organizing_units" ou ON ou."id" = e."organizerId"
        WHERE ou."facultyId" = f."id" AND er."status" = 'REGISTERED' AND e."timeEnd" < NOW() AND NOT (
          (e."checkInMode" = 'ONE_WAY' AND EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."eventId" = er."eventId" AND ar."studentId" = er."studentId" AND ar."direction" = 'CHECK_IN' AND ar."status" IN ('ATTENDED', 'LATE'))) OR
          (e."checkInMode" = 'TWO_WAY' AND EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."eventId" = er."eventId" AND ar."studentId" = er."studentId" AND ar."direction" = 'CHECK_IN' AND ar."status" IN ('ATTENDED', 'LATE')) AND EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."eventId" = er."eventId" AND ar."studentId" = er."studentId" AND ar."direction" = 'CHECK_OUT' AND ar."status" IN ('ATTENDED', 'LATE')))
        )) AS "absences"
    FROM "faculties" f
    WHERE (${facultyId ?? null}::uuid IS NULL OR f."id" = ${facultyId ?? null}::uuid)
    ORDER BY f."code" ASC
  `;
  const participationTotals = participation[0] ?? { attended: 0n, absences: 0n };
  const attended = Number(participationTotals.attended);
  const absences = Number(participationTotals.absences);
  const data = {
    scope: access.manageAnyUnit ? "GLOBAL" : "FACULTY",
    facultyId: facultyId ?? null,
    totals: {
      students,
      faculties,
      events: { upcoming, ongoing, completed, total: upcoming + ongoing + completed },
      registrations,
      attendanceRecords: attended,
      absences,
      attendanceRate: attended + absences === 0 ? 0 : Math.round(attended / (attended + absences) * 10_000) / 100,
    },
    faculties: facultyStats.map((item) => ({
      ...item,
      students: Number(item.students),
      events: Number(item.events),
      registrations: Number(item.registrations),
      attendanceRecords: Number(item.attendanceRecords),
      absences: Number(item.absences),
      attendanceRate: Number(item.attendanceRecords) + Number(item.absences) === 0 ? 0 : Math.round(Number(item.attendanceRecords) / (Number(item.attendanceRecords) + Number(item.absences)) * 10_000) / 100,
    })),
  };
  await redisClient.getClient().set(cacheKey, JSON.stringify(data, serialize), "EX", 60);
  return data;
}
