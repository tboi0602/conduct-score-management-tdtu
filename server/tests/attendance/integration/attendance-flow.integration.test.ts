import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { prisma } from "../../../src/config/prisma";

type Actor = { id: string; token: string };
type StudentFixture = {
  studentId: string;
  studentCode: string;
  token: string;
  clientAttemptId: string;
};
type Manifest = {
  eventId: string;
  qrToken: string;
  coordinates: { latitude: number; longitude: number; accuracyMeters: number };
  organizers: Actor[];
  students: StudentFixture[];
  manualOnlyStudent: Omit<StudentFixture, "clientAttemptId">;
};

const enabled = process.env.RUN_ATTENDANCE_INTEGRATION === "true";
const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost";
let fixture: Manifest;

async function post(path: string, token: string, body: unknown): Promise<Response> {
  return fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function waitUntilProcessed(studentId: string, source: string): Promise<string> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const request = await prisma.attendanceScanRequest.findFirst({
      where: { eventId: fixture.eventId, studentId, source: source as never },
      orderBy: { createdAt: "desc" },
      select: { status: true, rejectionReason: true },
    });
    if (request && request.status !== "PENDING") {
      return request.rejectionReason ?? request.status;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }
  throw new Error(`Request ${source}/${studentId} was not processed within 30 seconds`);
}

describe.runIf(enabled)("attendance flow with live infrastructure", () => {
  beforeAll(async () => {
    fixture = JSON.parse(
      await readFile(
        resolve(process.cwd(), "tests/.artifacts/attendance-load-manifest.json"),
        "utf8",
      ),
    ) as Manifest;
    await prisma.$connect();
  });

  afterAll(async () => prisma.$disconnect());

  test("student QR is queued and accepted", async () => {
    const student = fixture.students[0];
    const response = await post("/api/v1/attendance/scan/qr", student.token, {
      token: fixture.qrToken,
      ...fixture.coordinates,
      clientAttemptId: student.clientAttemptId,
    });
    expect(response.status).toBe(202);
    expect(await waitUntilProcessed(student.studentId, "STUDENT_QR")).toBe("ACCEPTED");
  });

  test("two organizers scanning the same barcode create one record", async () => {
    const student = fixture.students[1];
    const body = {
      studentCode: student.studentCode,
      direction: "CHECK_IN",
      source: "STAFF_BARCODE",
      status: "ATTENDED",
    };
    const responses = await Promise.all(
      fixture.organizers
        .slice(0, 2)
        .map((actor) =>
          post(`/api/v1/attendance/events/${fixture.eventId}/scan`, actor.token, body),
        ),
    );
    expect(responses.map(({ status }) => status)).toEqual([202, 202]);
    await waitUntilProcessed(student.studentId, "STAFF_BARCODE");
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
    expect(
      await prisma.attendanceRecord.count({
        where: { eventId: fixture.eventId, studentId: student.studentId, direction: "CHECK_IN" },
      }),
    ).toBe(1);
  });

  test("barcode rejects an unregistered student", async () => {
    const student = fixture.manualOnlyStudent;
    const requestsBefore = await prisma.attendanceScanRequest.count({
      where: { eventId: fixture.eventId, studentId: student.studentId, source: "STAFF_BARCODE" },
    });
    const recordsBefore = await prisma.attendanceRecord.count({
      where: { eventId: fixture.eventId, studentId: student.studentId },
    });
    const response = await post(
      `/api/v1/attendance/events/${fixture.eventId}/scan`,
      fixture.organizers[0].token,
      {
        studentCode: student.studentCode,
        direction: "CHECK_IN",
        source: "STAFF_BARCODE",
        status: "ATTENDED",
      },
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "REQUEST_FAILED",
        message: "Student is not actively registered for this event",
      },
    });
    expect(
      await prisma.attendanceScanRequest.count({
        where: { eventId: fixture.eventId, studentId: student.studentId, source: "STAFF_BARCODE" },
      }),
    ).toBe(requestsBefore);
    expect(
      await prisma.attendanceRecord.count({
        where: { eventId: fixture.eventId, studentId: student.studentId },
      }),
    ).toBe(recordsBefore);
  });

  test("manual entry accepts an unregistered student and records actor", async () => {
    const student = fixture.manualOnlyStudent;
    const actor = fixture.organizers[2];
    const response = await post(`/api/v1/attendance/events/${fixture.eventId}/scan`, actor.token, {
      studentCode: student.studentCode,
      direction: "CHECK_IN",
      source: "MANUAL_ENTRY",
      status: "LATE",
    });
    expect(response.status).toBe(202);
    expect(await waitUntilProcessed(student.studentId, "MANUAL_ENTRY")).toBe("ACCEPTED");
    const request = await prisma.attendanceScanRequest.findFirstOrThrow({
      where: { eventId: fixture.eventId, studentId: student.studentId, source: "MANUAL_ENTRY" },
      orderBy: { createdAt: "desc" },
    });
    expect(request.submittedByUserId).toBe(actor.id);
    expect(request.requestedStatus).toBe("LATE");
  });
});
