import { describe, expect, it } from "vitest";

import {
  onlineConversionBlocker,
  onlinePassingScoreChangeBlocked,
} from "../../src/services/events/event.service";

const future = new Date("2026-12-01T08:00:00.000Z");
const now = new Date("2026-11-01T08:00:00.000Z");

function state(
  overrides: Partial<Parameters<typeof onlineConversionBlocker>[0]> = {},
): Parameters<typeof onlineConversionBlocker>[0] {
  return {
    timeStart: future,
    attendanceSessions: 0,
    attendanceScanRequests: 0,
    attendanceRecords: 0,
    attendanceAppeals: 0,
    attendanceAppealAttempts: 0,
    conductScoreEntries: 0,
    ...overrides,
  };
}

describe("offline event online conversion", () => {
  it("allows a future event without operational data", () => {
    expect(onlineConversionBlocker(state(), now)).toBeNull();
  });

  it.each([
    ["EVENT_HAS_ATTENDANCE_SESSIONS", { attendanceSessions: 1 }],
    ["EVENT_HAS_ATTENDANCE_REQUESTS", { attendanceScanRequests: 1 }],
    ["EVENT_HAS_ATTENDANCE_RECORDS", { attendanceRecords: 1 }],
    ["EVENT_HAS_APPEALS", { attendanceAppeals: 1 }],
    ["EVENT_HAS_APPEALS", { attendanceAppealAttempts: 1 }],
    ["EVENT_HAS_CONDUCT_SCORE_ENTRIES", { conductScoreEntries: 1 }],
  ] as const)("returns %s for matching operational data", (code, overrides) => {
    expect(onlineConversionBlocker(state(overrides), now)).toBe(code);
  });

  it("prioritizes an event that has already started", () => {
    expect(
      onlineConversionBlocker(
        state({
          timeStart: now,
          attendanceSessions: 1,
          attendanceScanRequests: 1,
          attendanceRecords: 1,
          attendanceAppeals: 1,
          conductScoreEntries: 1,
        }),
        now,
      ),
    ).toBe("EVENT_ALREADY_STARTED");
  });
});

describe("online passing score locking", () => {
  it("allows changing the score before the first import batch", () => {
    expect(
      onlinePassingScoreChangeBlocked({
        currentDeliveryMode: "ONLINE",
        nextDeliveryMode: "ONLINE",
        currentScore: 6,
        nextScore: 7,
        importBatchCount: 0,
      }),
    ).toBe(false);
  });

  it("blocks changing the score after the first import batch", () => {
    expect(
      onlinePassingScoreChangeBlocked({
        currentDeliveryMode: "ONLINE",
        nextDeliveryMode: "ONLINE",
        currentScore: 6,
        nextScore: 7,
        importBatchCount: 1,
      }),
    ).toBe(true);
  });

  it("allows saving the same score and converting the event offline", () => {
    expect(
      onlinePassingScoreChangeBlocked({
        currentDeliveryMode: "ONLINE",
        nextDeliveryMode: "ONLINE",
        currentScore: 6,
        nextScore: 6,
        importBatchCount: 1,
      }),
    ).toBe(false);
    expect(
      onlinePassingScoreChangeBlocked({
        currentDeliveryMode: "ONLINE",
        nextDeliveryMode: "OFFLINE",
        currentScore: 6,
        nextScore: null,
        importBatchCount: 1,
      }),
    ).toBe(false);
  });
});
