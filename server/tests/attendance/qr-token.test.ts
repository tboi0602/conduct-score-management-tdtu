import { describe, expect, it } from "vitest";

import { createAttendanceQrToken, verifyAttendanceQrToken } from "../../src/utils/attendanceQr";

const PERIOD_MS = 5 * 60 * 1000;

describe("attendance QR token", () => {
  it("accepts a token in the current five-minute slot", () => {
    const now = 1_800_000_000_000;
    const qr = createAttendanceQrToken("session-current", now);
    expect(verifyAttendanceQrToken(qr.token, now + 10_000)).toBe("session-current");
  });

  it("accepts the previous slot during the 30-second grace period", () => {
    const boundary = 1_800_000_000_000;
    const qr = createAttendanceQrToken("session-grace", boundary - 1);
    expect(verifyAttendanceQrToken(qr.token, boundary + 29_999)).toBe("session-grace");
  });

  it("rejects the previous slot after grace expires", () => {
    const boundary = 1_800_000_000_000;
    const qr = createAttendanceQrToken("session-expired", boundary - 1);
    expect(() => verifyAttendanceQrToken(qr.token, boundary + 30_001)).toThrow(
      "QR token is invalid or expired",
    );
  });

  it("rejects a modified signature", () => {
    const now = Math.floor(Date.now() / PERIOD_MS) * PERIOD_MS;
    const qr = createAttendanceQrToken("session-tampered", now);
    const parts = qr.token.split(".");
    parts[2] = `${parts[2].slice(0, -1)}x`;
    expect(() => verifyAttendanceQrToken(parts.join("."), now)).toThrow(
      "QR token is invalid or expired",
    );
  });
});
