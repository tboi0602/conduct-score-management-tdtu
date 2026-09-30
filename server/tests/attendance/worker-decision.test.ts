import type { AttendanceScanRequest } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  attendanceRejectionReason,
  type LoadedAttendanceRequest,
} from "../../src/workers/attendance.worker";

function request(
  overrides: Partial<AttendanceScanRequest> &
    Partial<Pick<LoadedAttendanceRequest, "session" | "event">> = {},
): LoadedAttendanceRequest {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: "00000000-0000-4000-8000-000000000001",
    clientAttemptId: "00000000-0000-4000-8000-000000000002",
    eventId: "00000000-0000-4000-8000-000000000003",
    sessionId: "00000000-0000-4000-8000-000000000004",
    studentId: "00000000-0000-4000-8000-000000000005",
    submittedByUserId: "00000000-0000-4000-8000-000000000006",
    direction: "CHECK_IN",
    source: "STUDENT_QR",
    requestedStatus: "ATTENDED",
    latitude: 10.7326,
    longitude: 106.6998,
    accuracyMeters: 20,
    status: "PENDING",
    rejectionReason: null,
    correlationId: "00000000-0000-4000-8000-000000000007",
    processedAt: null,
    createdAt: now,
    updatedAt: now,
    event: {
      checkInMode: "ONE_WAY",
      points: 5,
      organizer: { facultyId: "00000000-0000-4000-8000-000000000008" },
    },
    session: {
      status: "OPEN",
      direction: "CHECK_IN",
      centerLatitude: 10.7326,
      centerLongitude: 106.6998,
      centerAccuracyMeters: 10,
      radiusMeters: 100,
    },
    student: { userId: "00000000-0000-4000-8000-000000000009" },
    ...overrides,
  } as LoadedAttendanceRequest;
}

describe("attendance worker decision", () => {
  it("accepts a registered QR scan inside the geofence", () => {
    expect(attendanceRejectionReason(request(), true)).toBeNull();
  });

  it("requires registration for QR and barcode", () => {
    expect(attendanceRejectionReason(request(), false)).toBe("NOT_REGISTERED");
    expect(
      attendanceRejectionReason(request({ source: "STAFF_BARCODE", session: null }), false),
    ).toBe("NOT_REGISTERED");
  });

  it("allows manual entry without an event registration", () => {
    expect(
      attendanceRejectionReason(request({ source: "MANUAL_ENTRY", session: null }), false),
    ).toBeNull();
  });

  it("rejects check-out for a one-way event", () => {
    expect(attendanceRejectionReason(request({ direction: "CHECK_OUT" }), true)).toBe(
      "DIRECTION_NOT_ALLOWED",
    );
  });

  it("rejects an inaccurate QR location", () => {
    expect(attendanceRejectionReason(request({ accuracyMeters: 100.01 }), true)).toBe(
      "LOCATION_INACCURATE",
    );
  });

  it("rejects a QR scan outside radius plus device accuracies", () => {
    expect(attendanceRejectionReason(request({ latitude: 10.735, accuracyMeters: 5 }), true)).toBe(
      "OUTSIDE_GEOFENCE",
    );
  });

  it("requires an open matching session for student QR", () => {
    expect(
      attendanceRejectionReason(
        request({
          session: {
            status: "CLOSED",
            direction: "CHECK_IN",
            centerLatitude: 10.7326,
            centerLongitude: 106.6998,
            centerAccuracyMeters: 10,
            radiusMeters: 100,
          },
        }),
        true,
      ),
    ).toBe("SESSION_CLOSED");
  });
});
