import { createHmac, timingSafeEqual } from "crypto";
import { logger } from "@config/logger";
import { attendanceQrValidationTotal } from "@metrics";
import { ApiError } from "@utils/ApiError";
import { env } from "@config/env";

const PERIOD_MS = 5 * 60 * 1000;
const GRACE_MS = 30 * 1000;
const SECRET = (() => {
  const value = env.attendanceQrSecret;
  if (value) return value;
  if (env.nodeEnv === "production")
    throw new Error("ATTENDANCE_QR_SECRET is required in production");
  logger.warn("[attendance] using insecure development QR secret");
  return "change_me_attendance_qr_secret";
})();

function signature(sessionId: string, slot: number): string {
  return createHmac("sha256", SECRET).update(`${sessionId}:${slot}`).digest("base64url");
}

export function createAttendanceQrToken(sessionId: string, now = Date.now()) {
  const slot = Math.floor(now / PERIOD_MS);
  return {
    token: `${sessionId}.${slot}.${signature(sessionId, slot)}`,
    expiresAt: new Date((slot + 1) * PERIOD_MS).toISOString(),
  };
}

export function verifyAttendanceQrToken(token: string, now = Date.now()): string {
  const [sessionId, slotRaw, supplied] = token.split(".");
  const slot = Number(slotRaw);
  const current = Math.floor(now / PERIOD_MS);
  const previousAllowed = slot === current - 1 && now - current * PERIOD_MS <= GRACE_MS;
  if (
    !sessionId ||
    !Number.isInteger(slot) ||
    !supplied ||
    (slot !== current && !previousAllowed)
  ) {
    attendanceQrValidationTotal.inc({ result: "expired" });
    throw new ApiError(409, "QR token is invalid or expired", "QR_EXPIRED");
  }
  const expected = Buffer.from(signature(sessionId, slot));
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    attendanceQrValidationTotal.inc({ result: "invalid" });
    throw new ApiError(409, "QR token is invalid or expired", "QR_INVALID");
  }
  attendanceQrValidationTotal.inc({ result: "valid" });
  return sessionId;
}
