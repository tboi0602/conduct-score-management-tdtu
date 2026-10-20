import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  findStudent: vi.fn(),
  findEvents: vi.fn(),
}));

vi.mock("@config/prisma", () => ({
  prisma: {
    student: { findUnique: prismaMocks.findStudent },
    event: { findMany: prismaMocks.findEvents },
  },
}));

import { listRecommendedEvents } from "@modules/events/services/event-recommendation.service";

describe("event recommendations", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T03:00:00.000Z"));
    prismaMocks.findStudent.mockResolvedValue({
      id: "student-1",
      schedules: [
        {
          semesterId: "semester-1",
          dayOfWeek: 8,
          classSessionId: "session-1",
          classSession: {
            startTime: new Date("1970-01-01T09:30:00.000Z"),
            endTime: new Date("1970-01-01T12:00:00.000Z"),
          },
        },
      ],
      scheduleExceptions: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("keeps ongoing online events after registration closes and ignores class schedules", async () => {
    prismaMocks.findEvents.mockResolvedValue([
      {
        id: "online-available",
        deliveryMode: "ONLINE",
        semesterId: "semester-1",
        timeStart: new Date("2026-10-18T02:00:00.000Z"),
        timeEnd: new Date("2026-10-18T06:00:00.000Z"),
        registrationStart: null,
        registrationEnd: null,
        capacity: null,
        registeredCount: 0,
        registrations: [],
        attendanceRecords: [],
      },
      {
        id: "online-without-registration",
        deliveryMode: "ONLINE",
        semesterId: "semester-1",
        timeStart: new Date("2026-10-18T02:00:00.000Z"),
        timeEnd: new Date("2026-10-18T06:00:00.000Z"),
        registrationStart: null,
        registrationEnd: null,
        capacity: null,
        registeredCount: 0,
        registrations: [],
        attendanceRecords: [],
      },
    ]);

    const result = await listRecommendedEvents(
      "user-1",
      { page: 1, limit: 6, skip: 0 },
      { deliveryMode: "ONLINE", status: "ONGOING" },
    );

    expect(result.items.map((event) => event.id)).toEqual([
      "online-available",
      "online-without-registration",
    ]);
    expect(result.pagination.total).toBe(2);

    const where = prismaMocks.findEvents.mock.calls[0]?.[0]?.where;
    expect(where.deliveryMode).toBe("ONLINE");
    expect(where.AND[0].OR[0]).toMatchObject({
      deliveryMode: "OFFLINE",
      registrationEnd: { gte: expect.any(Date) },
    });
    expect(where.AND[0].OR[1]).toMatchObject({
      deliveryMode: "ONLINE",
      timeEnd: { gt: expect.any(Date) },
    });
    expect(where.AND[0].OR[1]).not.toHaveProperty("registrationEnd");
    expect(where.AND[1]).toMatchObject({
      timeStart: { lte: expect.any(Date) },
      timeEnd: { gte: expect.any(Date) },
    });
  });

  it("continues excluding offline events that overlap a class session", async () => {
    prismaMocks.findEvents.mockResolvedValue([
      {
        id: "offline-conflict",
        deliveryMode: "OFFLINE",
        semesterId: "semester-1",
        timeStart: new Date("2026-10-18T03:30:00.000Z"),
        timeEnd: new Date("2026-10-18T04:30:00.000Z"),
        registrationStart: new Date("2026-10-01T00:00:00.000Z"),
        registrationEnd: new Date("2026-10-18T03:15:00.000Z"),
        capacity: null,
        registeredCount: 0,
        registrations: [],
        attendanceRecords: [],
      },
      {
        id: "offline-available",
        deliveryMode: "OFFLINE",
        semesterId: "semester-1",
        timeStart: new Date("2026-10-18T05:00:00.000Z"),
        timeEnd: new Date("2026-10-18T06:00:00.000Z"),
        registrationStart: new Date("2026-10-01T00:00:00.000Z"),
        registrationEnd: new Date("2026-10-18T04:30:00.000Z"),
        capacity: null,
        registeredCount: 0,
        registrations: [],
        attendanceRecords: [],
      },
    ]);

    const result = await listRecommendedEvents(
      "user-1",
      { page: 1, limit: 6, skip: 0 },
      { deliveryMode: "OFFLINE" },
    );

    expect(result.items.map((event) => event.id)).toEqual(["offline-available"]);
    expect(result.pagination.total).toBe(1);
  });
});
