import { Prisma } from "@prisma/client";

import { prisma } from "@config/prisma";
import { redisClient } from "@redis";
import { getEventAccess } from "@services/events/event-access.service";
import { ApiError } from "@utils/ApiError";

type CountRow = Record<string, bigint | number | string | null>;

const number = (value: bigint | number | string | null | undefined) => Number(value ?? 0);
const percent = (part: number, total: number) =>
  total ? Math.round((part / total) * 10_000) / 100 : 0;

export async function getDashboardInsights(userId: string, requestedSemesterId?: string) {
  const access = await getEventAccess(userId);
  const currentSemester = await prisma.semester.findFirst({
    where: { startDate: { lte: new Date() }, endDate: { gte: new Date() } },
    select: { id: true, year: true, type: true },
  });
  const semester = requestedSemesterId
    ? await prisma.semester.findUnique({
        where: { id: requestedSemesterId },
        select: { id: true, year: true, type: true },
      })
    : (currentSemester ??
      (await prisma.semester.findFirst({
        orderBy: [{ year: "desc" }, { type: "asc" }],
        select: { id: true, year: true, type: true },
      })));
  if (!semester) throw new ApiError(404, "Semester not found");
  const facultyId = access.manageAnyUnit ? null : access.facultyId;
  const scopeKey = access.manageAnyUnit
    ? "global"
    : facultyId
      ? `faculty:${facultyId}`
      : `user:${userId}`;
  const version =
    (await redisClient
      .getClient()
      .get(`dashboard:version:${scopeKey}`)
      .catch(() => "0")) ?? "0";
  const cacheKey = `dashboard:v5:${scopeKey}:${semester.id}:${version}`;
  const cached = await redisClient
    .getClient()
    .get(cacheKey)
    .catch(() => null);
  if (cached) return JSON.parse(cached) as unknown;

  const facultyParam = facultyId ?? null;
  const [
    summaryRows,
    lifecycleRows,
    attendanceRows,
    rankingRows,
    trendRows,
    facultyRows,
    classRows,
    topEvents,
  ] = await Promise.all([
    prisma.$queryRaw<CountRow[]>`
      SELECT
        (SELECT COUNT(*) FROM "students" s LEFT JOIN "classes" c ON c."id"=s."classId" LEFT JOIN "majors" m ON m."id"=c."majorId" WHERE (${facultyParam}::uuid IS NULL OR m."facultyId"=${facultyParam}::uuid)) "students",
        (SELECT COUNT(*) FROM "faculties" f WHERE (${facultyParam}::uuid IS NULL OR f."id"=${facultyParam}::uuid)) "faculties",
        (SELECT COUNT(*) FROM "classes" c JOIN "majors" m ON m."id"=c."majorId" WHERE (${facultyParam}::uuid IS NULL OR m."facultyId"=${facultyParam}::uuid)) "classes",
        (SELECT COUNT(*) FROM "users" u WHERE u."status"='ACTIVE' AND EXISTS (SELECT 1 FROM "user_roles" ur JOIN "roles" r ON r."id"=ur."roleId" WHERE ur."userId"=u."id" AND r."name" IN ('EVENT_ORGANIZER','STUDENT_AFFAIRS')) AND (${facultyParam}::uuid IS NULL OR u."primaryFacultyId"=${facultyParam}::uuid)) "staff",
        (SELECT COUNT(*) FROM "event_registrations" er JOIN "events" e ON e."id"=er."eventId" LEFT JOIN "organizing_units" ou ON ou."id"=e."organizerId" WHERE er."status"='REGISTERED' AND e."semesterId"=${semester.id}::uuid AND (${facultyParam}::uuid IS NULL OR ou."facultyId"=${facultyParam}::uuid)) "registrations",
        (SELECT COALESCE(AVG(cs."totalScore"),0) FROM "conduct_scores" cs JOIN "students" s ON s."id"=cs."studentId" LEFT JOIN "classes" c ON c."id"=s."classId" LEFT JOIN "majors" m ON m."id"=c."majorId" WHERE cs."semesterId"=${semester.id}::uuid AND (${facultyParam}::uuid IS NULL OR m."facultyId"=${facultyParam}::uuid)) "averageScore",
        (SELECT COUNT(*) FROM "students" s LEFT JOIN "classes" c ON c."id"=s."classId" LEFT JOIN "majors" m ON m."id"=c."majorId" LEFT JOIN "conduct_scores" cs ON cs."studentId"=s."id" AND cs."semesterId"=${semester.id}::uuid WHERE COALESCE(cs."totalScore", 0)<50 AND (${facultyParam}::uuid IS NULL OR m."facultyId"=${facultyParam}::uuid)) "atRisk",
        (SELECT COUNT(*) FROM "conduct_scores" cs JOIN "students" s ON s."id"=cs."studentId" LEFT JOIN "classes" c ON c."id"=s."classId" LEFT JOIN "majors" m ON m."id"=c."majorId" WHERE cs."semesterId"=${semester.id}::uuid AND cs."status"='DRAFT' AND (${facultyParam}::uuid IS NULL OR m."facultyId"=${facultyParam}::uuid)) "draftScores",
        (SELECT COUNT(*) FROM "conduct_scores" cs JOIN "students" s ON s."id"=cs."studentId" LEFT JOIN "classes" c ON c."id"=s."classId" LEFT JOIN "majors" m ON m."id"=c."majorId" WHERE cs."semesterId"=${semester.id}::uuid AND cs."status"='FINAL' AND (${facultyParam}::uuid IS NULL OR m."facultyId"=${facultyParam}::uuid)) "finalScores"
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE e."timeStart">NOW()) "upcoming",
        COUNT(*) FILTER (WHERE e."timeStart"<=NOW() AND e."timeEnd">=NOW()) "ongoing",
        COUNT(*) FILTER (WHERE e."timeEnd"<NOW()) "completed"
      FROM "events" e LEFT JOIN "organizing_units" ou ON ou."id"=e."organizerId"
      WHERE e."semesterId"=${semester.id}::uuid AND (${facultyParam}::uuid IS NULL OR ou."facultyId"=${facultyParam}::uuid)
    `,
    prisma.$queryRaw<CountRow[]>`
      WITH participation AS (
        SELECT er."studentId", er."eventId",
          CASE WHEN (e."checkInMode"='ONE_WAY' AND EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."studentId"=er."studentId" AND ar."eventId"=er."eventId" AND ar."direction"='CHECK_IN' AND ar."status"='LATE'))
              OR (e."checkInMode"='TWO_WAY' AND EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."studentId"=er."studentId" AND ar."eventId"=er."eventId" AND ar."direction"='CHECK_IN' AND ar."status" IN ('ATTENDED','LATE')) AND EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."studentId"=er."studentId" AND ar."eventId"=er."eventId" AND ar."direction"='CHECK_OUT' AND ar."status" IN ('ATTENDED','LATE')) AND (EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."studentId"=er."studentId" AND ar."eventId"=er."eventId" AND ar."direction"='CHECK_IN' AND ar."status"='LATE') OR EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."studentId"=er."studentId" AND ar."eventId"=er."eventId" AND ar."direction"='CHECK_OUT' AND ar."status"='LATE'))) THEN 'late'
            WHEN (e."checkInMode"='ONE_WAY' AND EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."studentId"=er."studentId" AND ar."eventId"=er."eventId" AND ar."direction"='CHECK_IN' AND ar."status"='ATTENDED'))
              OR (e."checkInMode"='TWO_WAY' AND EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."studentId"=er."studentId" AND ar."eventId"=er."eventId" AND ar."direction"='CHECK_IN' AND ar."status" IN ('ATTENDED','LATE')) AND EXISTS (SELECT 1 FROM "attendance_records" ar WHERE ar."studentId"=er."studentId" AND ar."eventId"=er."eventId" AND ar."direction"='CHECK_OUT' AND ar."status" IN ('ATTENDED','LATE'))) THEN 'attended'
            ELSE 'absent' END result
        FROM "event_registrations" er JOIN "events" e ON e."id"=er."eventId" LEFT JOIN "organizing_units" ou ON ou."id"=e."organizerId"
        WHERE er."status"='REGISTERED' AND e."semesterId"=${semester.id}::uuid AND e."timeEnd"<NOW() AND (${facultyParam}::uuid IS NULL OR ou."facultyId"=${facultyParam}::uuid)
      ) SELECT COUNT(*) FILTER (WHERE result='attended') "attended", COUNT(*) FILTER (WHERE result='late') "late", COUNT(*) FILTER (WHERE result='absent') "absent" FROM participation
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT cs."ranking" "name", COUNT(*) "value" FROM "conduct_scores" cs JOIN "students" s ON s."id"=cs."studentId" LEFT JOIN "classes" c ON c."id"=s."classId" LEFT JOIN "majors" m ON m."id"=c."majorId"
      WHERE cs."semesterId"=${semester.id}::uuid AND (${facultyParam}::uuid IS NULL OR m."facultyId"=${facultyParam}::uuid) GROUP BY cs."ranking"
    `,
    prisma.$queryRaw<CountRow[]>`
      WITH weeks AS (
        SELECT generate_series(0, 11) AS week_offset
      ), buckets AS (
        SELECT date_trunc('week', NOW()) - (week_offset * INTERVAL '1 week') AS start_at
        FROM weeks
      )
      SELECT to_char(b.start_at,'DD/MM') "label",
        (SELECT COUNT(*) FROM "event_registrations" er JOIN "events" e ON e."id"=er."eventId" LEFT JOIN "organizing_units" ou ON ou."id"=e."organizerId" WHERE e."semesterId"=${semester.id}::uuid AND er."registeredAt">=b.start_at AND er."registeredAt"<b.start_at+INTERVAL '1 week' AND (${facultyParam}::uuid IS NULL OR ou."facultyId"=${facultyParam}::uuid)) "registrations",
        (SELECT COUNT(*) FROM "event_registrations" er JOIN "events" e ON e."id"=er."eventId" LEFT JOIN "organizing_units" ou ON ou."id"=e."organizerId"
          WHERE er."status"='REGISTERED' AND e."semesterId"=${semester.id}::uuid AND (${facultyParam}::uuid IS NULL OR ou."facultyId"=${facultyParam}::uuid)
            AND EXISTS (SELECT 1 FROM "attendance_records" checkin WHERE checkin."studentId"=er."studentId" AND checkin."eventId"=er."eventId" AND checkin."direction"='CHECK_IN' AND checkin."status" IN ('ATTENDED','LATE') AND checkin."createdAt">=b.start_at AND checkin."createdAt"<b.start_at+INTERVAL '1 week')
            AND ((e."checkInMode"='ONE_WAY') OR EXISTS (SELECT 1 FROM "attendance_records" checkout WHERE checkout."studentId"=er."studentId" AND checkout."eventId"=er."eventId" AND checkout."direction"='CHECK_OUT' AND checkout."status" IN ('ATTENDED','LATE')))) "attendance"
      FROM buckets b ORDER BY b.start_at
    `,
    access.manageAnyUnit
      ? prisma.$queryRaw<CountRow[]>`
      SELECT f."id",f."code",f."name",COUNT(DISTINCT s."id") "students",COALESCE(AVG(cs."totalScore"),0) "averageScore"
      FROM "faculties" f LEFT JOIN "majors" m ON m."facultyId"=f."id" LEFT JOIN "classes" c ON c."majorId"=m."id" LEFT JOIN "students" s ON s."classId"=c."id" LEFT JOIN "conduct_scores" cs ON cs."studentId"=s."id" AND cs."semesterId"=${semester.id}::uuid GROUP BY f."id",f."code",f."name" ORDER BY "averageScore" DESC
    `
      : Promise.resolve([]),
    !access.manageAnyUnit
      ? prisma.$queryRaw<CountRow[]>`
      SELECT c."id",c."code",c."name",COUNT(DISTINCT s."id") "students",COALESCE(AVG(cs."totalScore"),0) "averageScore"
      FROM "classes" c JOIN "majors" m ON m."id"=c."majorId" LEFT JOIN "students" s ON s."classId"=c."id" LEFT JOIN "conduct_scores" cs ON cs."studentId"=s."id" AND cs."semesterId"=${semester.id}::uuid WHERE m."facultyId"=${facultyParam}::uuid GROUP BY c."id",c."code",c."name" ORDER BY "averageScore" DESC LIMIT 20
    `
      : Promise.resolve([]),
    prisma.$queryRaw<CountRow[]>`
      SELECT e."id",e."name",e."capacity",COUNT(DISTINCT er."id") FILTER (WHERE er."status"='REGISTERED') "registrations",
        COUNT(DISTINCT ar."studentId") FILTER (WHERE ar."status" IN ('ATTENDED','LATE')) "attendance"
      FROM "events" e LEFT JOIN "organizing_units" ou ON ou."id"=e."organizerId" LEFT JOIN "event_registrations" er ON er."eventId"=e."id" LEFT JOIN "attendance_records" ar ON ar."eventId"=e."id"
      WHERE e."semesterId"=${semester.id}::uuid AND (${facultyParam}::uuid IS NULL OR ou."facultyId"=${facultyParam}::uuid)
      GROUP BY e."id",e."name",e."capacity" ORDER BY "attendance" DESC,"registrations" DESC LIMIT 5
    `,
  ]);

  const summary = summaryRows[0] ?? {};
  const lifecycle = lifecycleRows[0] ?? {};
  const attendance = attendanceRows[0] ?? {};
  const attended = number(attendance.attended) + number(attendance.late);
  const absence = number(attendance.absent);
  const mapComparison = (row: CountRow) => ({
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    students: number(row.students),
    averageScore: Math.round(number(row.averageScore) * 100) / 100,
  });
  const data = {
    scope: access.manageAnyUnit ? "GLOBAL" : "FACULTY",
    facultyId,
    semester,
    totals: {
      students: number(summary.students),
      faculties: number(summary.faculties),
      classes: number(summary.classes),
      staff: number(summary.staff),
      events: {
        upcoming: number(lifecycle.upcoming),
        ongoing: number(lifecycle.ongoing),
        completed: number(lifecycle.completed),
        total: number(lifecycle.upcoming) + number(lifecycle.ongoing) + number(lifecycle.completed),
      },
      registrations: number(summary.registrations),
      attendanceRecords: attended,
      absences: absence,
      attendanceRate: percent(attended, attended + absence),
      averageScore: Math.round(number(summary.averageScore) * 100) / 100,
      atRisk: number(summary.atRisk),
      draftScores: number(summary.draftScores),
      finalScores: number(summary.finalScores),
    },
    trend: trendRows.map((row) => ({
      label: String(row.label),
      registrations: number(row.registrations),
      attendance: number(row.attendance),
    })),
    attendance: {
      attended: number(attendance.attended),
      late: number(attendance.late),
      absent: absence,
    },
    rankings: rankingRows.map((row) => ({ name: String(row.name), value: number(row.value) })),
    comparison: (access.manageAnyUnit ? facultyRows : classRows).map(mapComparison),
    topEvents: topEvents.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      capacity: row.capacity === null ? null : number(row.capacity),
      registrations: number(row.registrations),
      attendance: number(row.attendance),
    })),
  };
  await redisClient
    .getClient()
    .set(cacheKey, JSON.stringify(data), "EX", 60)
    .catch(() => undefined);
  return data;
}
