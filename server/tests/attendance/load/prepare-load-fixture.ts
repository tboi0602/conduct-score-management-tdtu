import "dotenv/config";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { prisma } from "../../../src/config/prisma";
import { signAccessToken } from "../../../src/config/auth";
import { redisClient } from "../../../src/redis";
import { activeSessionKey } from "../../../src/modules/attendance/services/attendance-session.service";
import { createAttendanceQrToken } from "../../../src/utils/attendanceQr";

const STUDENT_COUNT = Number(process.env.ATTENDANCE_TEST_STUDENTS ?? 1000);
const PREFIX = process.env.ATTENDANCE_TEST_PREFIX ?? "ATTLOAD";
const CENTER = { latitude: 10.7326, longitude: 106.6998, accuracyMeters: 10 };
const artifactDir = resolve(process.cwd(), "tests/.artifacts");

function deterministicUuid(value: string): string {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((Number.parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

async function redisReady(): Promise<void> {
  const client = redisClient.connect();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (client.status === "ready") return;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error("Redis was not ready after 7.5 seconds");
}

async function main(): Promise<void> {
  if (!Number.isInteger(STUDENT_COUNT) || STUDENT_COUNT < 1 || STUDENT_COUNT > 5000) {
    throw new Error("ATTENDANCE_TEST_STUDENTS must be an integer from 1 to 5000");
  }
  await prisma.$connect();
  await redisReady();

  const faculty = await prisma.faculty.upsert({
    where: { code: `${PREFIX}-FAC` },
    update: { name: "Khoa kiểm thử tải điểm danh" },
    create: { code: `${PREFIX}-FAC`, name: "Khoa kiểm thử tải điểm danh" },
  });
  const major = await prisma.major.upsert({
    where: { code: `${PREFIX}-MAJ` },
    update: { name: "Ngành kiểm thử tải", facultyId: faculty.id },
    create: { code: `${PREFIX}-MAJ`, name: "Ngành kiểm thử tải", facultyId: faculty.id },
  });
  const classRecord = await prisma.class.upsert({
    where: { code: `${PREFIX}-CLASS` },
    update: { name: "Lớp kiểm thử tải", majorId: major.id },
    create: { code: `${PREFIX}-CLASS`, name: "Lớp kiểm thử tải", majorId: major.id },
  });
  const organizerUnit = await prisma.organizingUnit.upsert({
    where: { code: `${PREFIX}-UNIT` },
    update: { name: "Đơn vị kiểm thử tải", facultyId: faculty.id, type: "FACULTY" },
    create: {
      code: `${PREFIX}-UNIT`,
      name: "Đơn vị kiểm thử tải",
      facultyId: faculty.id,
      type: "FACULTY",
    },
  });
  const criterionId = deterministicUuid(`${PREFIX}:criterion`);
  const criterion = await prisma.criteria.upsert({
    where: { id: criterionId },
    update: { title: "Tiêu chí kiểm thử tải", maxPoints: 20 },
    create: { id: criterionId, title: "Tiêu chí kiểm thử tải", maxPoints: 20 },
  });
  const semester = await prisma.semester.upsert({
    where: { year_type: { year: 2099, type: "HK1" } },
    update: {},
    create: {
      year: 2099,
      type: "HK1",
      startDate: new Date("2099-01-01T00:00:00.000Z"),
      endDate: new Date("2099-12-31T00:00:00.000Z"),
    },
  });

  const eventId = deterministicUuid(`${PREFIX}:event`);
  await prisma.event.deleteMany({ where: { id: eventId } });
  const now = Date.now();
  const event = await prisma.event.create({
    data: {
      id: eventId,
      criteriaId: criterion.id,
      semesterId: semester.id,
      organizerId: organizerUnit.id,
      name: "Sự kiện kiểm thử hiệu suất điểm danh",
      description: "Dữ liệu kiểm thử tự động, không phải sinh viên thật.",
      descriptionPreview: "Dữ liệu kiểm thử tự động.",
      location: "TDTU load-test fixture",
      deliveryMode: "OFFLINE",
      timeStart: new Date(now - 60 * 60 * 1000),
      timeEnd: new Date(now + 4 * 60 * 60 * 1000),
      registrationStart: new Date(now - 24 * 60 * 60 * 1000),
      registrationEnd: new Date(now - 60 * 60 * 1000),
      capacity: null,
      registeredCount: STUDENT_COUNT,
      points: 5,
      type: "FACULTY",
      checkInMode: "ONE_WAY",
      attendanceRadiusMeters: 100,
    },
  });

  const roleIds = new Map(
    (
      await prisma.role.findMany({
        where: { name: { in: ["STUDENT", "EVENT_ORGANIZER"] } },
        select: { id: true, name: true },
      })
    ).map((role) => [role.name, role.id]),
  );
  const studentRoleId = roleIds.get("STUDENT");
  const organizerRoleId = roleIds.get("EVENT_ORGANIZER");
  if (!studentRoleId || !organizerRoleId) {
    throw new Error("Run seed:local first so STUDENT and EVENT_ORGANIZER roles exist");
  }

  const organizers = Array.from({ length: 3 }, (_, index) => ({
    id: deterministicUuid(`${PREFIX}:organizer:${index + 1}`),
    email: `${PREFIX.toLowerCase()}.organizer${index + 1}@tdtu.edu.vn`,
    name: `Load Test Organizer ${String.fromCharCode(65 + index)}`,
  }));
  await prisma.user.createMany({
    data: organizers.map((organizer) => ({
      ...organizer,
      status: "ACTIVE",
      primaryFacultyId: faculty.id,
    })),
    skipDuplicates: true,
  });
  await prisma.user.updateMany({
    where: { id: { in: organizers.map(({ id }) => id) } },
    data: { status: "ACTIVE", primaryFacultyId: faculty.id },
  });
  await prisma.userRole.createMany({
    data: organizers.map((organizer) => ({ userId: organizer.id, roleId: organizerRoleId })),
    skipDuplicates: true,
  });

  const manualOnly = {
    userId: deterministicUuid(`${PREFIX}:manual-user`),
    studentId: deterministicUuid(`${PREFIX}:manual-student`),
    studentCode: `${PREFIX}MANUAL`,
    email: `${PREFIX.toLowerCase()}.manual@student.tdtu.edu.vn`,
    name: "Load Test Manual-only Student",
  };
  await prisma.user.upsert({
    where: { id: manualOnly.userId },
    update: { email: manualOnly.email, name: manualOnly.name, status: "ACTIVE" },
    create: {
      id: manualOnly.userId,
      email: manualOnly.email,
      name: manualOnly.name,
      status: "ACTIVE",
    },
  });
  await prisma.student.upsert({
    where: { id: manualOnly.studentId },
    update: { classId: classRecord.id, studentCode: manualOnly.studentCode },
    create: {
      id: manualOnly.studentId,
      userId: manualOnly.userId,
      classId: classRecord.id,
      studentCode: manualOnly.studentCode,
    },
  });
  await prisma.userRole.createMany({
    data: [{ userId: manualOnly.userId, roleId: studentRoleId }],
    skipDuplicates: true,
  });

  const students = Array.from({ length: STUDENT_COUNT }, (_, index) => {
    const number = index + 1;
    const userId = deterministicUuid(`${PREFIX}:student-user:${number}`);
    const studentId = deterministicUuid(`${PREFIX}:student:${number}`);
    return {
      userId,
      studentId,
      studentCode: `${PREFIX}${String(number).padStart(5, "0")}`,
      email: `${PREFIX.toLowerCase()}.${String(number).padStart(5, "0")}@student.tdtu.edu.vn`,
      name: `Load Test Student ${number}`,
    };
  });
  await prisma.user.createMany({
    data: students.map((student) => ({
      id: student.userId,
      email: student.email,
      name: student.name,
      status: "ACTIVE",
    })),
    skipDuplicates: true,
  });
  await prisma.student.createMany({
    data: students.map((student) => ({
      id: student.studentId,
      userId: student.userId,
      classId: classRecord.id,
      studentCode: student.studentCode,
    })),
    skipDuplicates: true,
  });
  await prisma.userRole.createMany({
    data: students.map((student) => ({ userId: student.userId, roleId: studentRoleId })),
    skipDuplicates: true,
  });
  await prisma.eventRegistration.createMany({
    data: students.map((student) => ({
      id: deterministicUuid(`${PREFIX}:registration:${student.studentId}`),
      eventId: event.id,
      studentId: student.studentId,
      status: "REGISTERED",
      registeredByUserId: student.userId,
    })),
    skipDuplicates: true,
  });

  const session = await prisma.attendanceSession.create({
    data: {
      eventId: event.id,
      direction: "CHECK_IN",
      status: "OPEN",
      centerLatitude: CENTER.latitude,
      centerLongitude: CENTER.longitude,
      centerAccuracyMeters: CENTER.accuracyMeters,
      radiusMeters: 100,
      openedByUserId: organizers[0].id,
    },
  });
  await redisClient.getClient().set(activeSessionKey(event.id), session.id, "EX", 24 * 60 * 60);
  const qr = createAttendanceQrToken(session.id);
  const manifest = {
    schemaVersion: 1,
    prefix: PREFIX,
    createdAt: new Date().toISOString(),
    eventId: event.id,
    sessionId: session.id,
    qrToken: qr.token,
    qrExpiresAt: qr.expiresAt,
    coordinates: CENTER,
    organizers: organizers.map((organizer) => ({
      ...organizer,
      token: signAccessToken({ sub: organizer.id, role: "EVENT_ORGANIZER" }),
    })),
    manualOnlyStudent: {
      ...manualOnly,
      token: signAccessToken({ sub: manualOnly.userId, role: "STUDENT" }),
    },
    students: students.map((student, index) => ({
      ...student,
      token: signAccessToken({ sub: student.userId, role: "STUDENT" }),
      clientAttemptId: deterministicUuid(`${PREFIX}:attempt:${index + 1}`),
    })),
  };
  await mkdir(artifactDir, { recursive: true });
  await writeFile(
    resolve(artifactDir, "attendance-load-manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
  process.stdout.write(
    `${JSON.stringify({ eventId: event.id, sessionId: session.id, students: STUDENT_COUNT })}\n`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await redisClient.close();
    await prisma.$disconnect();
  });
