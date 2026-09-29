import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import type { AuthContext } from "@middleware/auth.middleware";
import { attendanceRoutingKeys, publishAttendanceEvent } from "@producers/attendance.producer";
import { env } from "@config/env";

export function auditAttendanceAccess(req: Request, res: Response, next: NextFunction): void {
  const started = process.hrtime.bigint();
  const requestId = req.header("x-request-id")?.slice(0, 100) || randomUUID();
  res.setHeader("X-Request-ID", requestId);
  res.once("finish", () => {
    const auth = res.locals.auth as AuthContext | undefined;
    const body = req.body as Record<string, unknown> | undefined;
    const attempt =
      req.header("x-client-attempt-id") ||
      (typeof body?.clientAttemptId === "string" ? body.clientAttemptId : null);
    const match = req.path.match(/^\/events\/([0-9a-f-]{36})\//i);
    const eventId = match?.[1] ?? (typeof body?.eventId === "string" ? body.eventId : null);
    const payload = {
      schemaVersion: 1,
      requestId,
      clientAttemptId: attempt?.slice(0, 36) ?? null,
      userId: auth?.sub ?? null,
      eventId,
      method: req.method,
      path: req.baseUrl + req.path,
      statusCode: res.statusCode,
      durationMs: Math.max(0, Math.round(Number(process.hrtime.bigint() - started) / 1_000_000)),
      instance: env.hostname,
      createdAt: new Date().toISOString(),
    };
    void publishAttendanceEvent(attendanceRoutingKeys.accessAudited, payload, {
      messageId: requestId,
      correlationId: requestId,
    }).catch(() => undefined);
  });
  next();
}
