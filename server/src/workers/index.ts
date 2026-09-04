import "dotenv/config";
import http from "http";
import type { ConsumeMessage } from "amqplib";

import { logger } from "../config/logger";
import { redisClient } from "../config/redis";
import { rabbitClient } from "../config/rabbitmq";
import { prisma } from "../config/prisma";
import { registry, attendanceEventsConsumed, rabbitConnected, redisConnected } from "../metrics";
import { sseHub } from "../realtime/sse";

const HEALTH_PORT = parseInt(process.env.WORKER_HEALTH_PORT ?? "9101", 10);

// ============================================================
// Health endpoint (issue: workers were previously invisible to
// Compose healthchecks). Prometheus scrapes /metrics on the same
// server.
// ============================================================
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    const rabbit = rabbitClient.isConnected();
    const redis = redisClient.getClient().status === "ready";
    const ok = rabbit && redis;
    res.writeHead(ok ? 200 : 503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok, rabbit, redis, ts: new Date().toISOString() }));
    return;
  }
  if (req.url === "/metrics") {
    void registry.metrics().then((body) => {
      res.writeHead(200, { "Content-Type": registry.contentType });
      res.end(body);
    });
    return;
  }
  res.writeHead(404).end();
});

function trackConnectionGauges(): void {
  setInterval(() => {
    rabbitConnected.set(rabbitClient.isConnected() ? 1 : 0);
    redisConnected.set(
      redisClient.getClient().status === "ready" ? 1 : 0,
    );
  }, 5_000).unref();
}

// ============================================================
// Scan processing pipeline
// ============================================================
type ScanPayload = {
  eventId?: string;
  studentId?: string;
  scanCode?: string;
  lat?: number;
  lng?: number;
  idempotencyKey?: string;
  ipAddress?: string;
  deviceId?: string;
};

async function handleScan(
  payload: Record<string, unknown>,
  msg: ConsumeMessage,
): Promise<void> {
  const scan = payload as ScanPayload;
  const { eventId, studentId } = scan;
  if (!eventId || !studentId) {
    // Malformed payloads will never succeed - dead-letter immediately.
    throw Object.assign(new Error("invalid scan payload"), {
      fatal: true,
    });
  }

  // Idempotency: SETNX dedupe lock before touching the database.
  const key = scan.idempotencyKey ?? msg.properties.messageId;
  if (!key) throw new Error("missing idempotency key");
  const acquired = await redisClient.acquireIdempotencyLock(key);
  if (!acquired) {
    logger.debug(`[worker] duplicate scan ignored (key=${key})`);
    attendanceEventsConsumed.inc({ result: "duplicate" });
    return;
  }

  try {
    const [event, student] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId } }),
      prisma.student.findUnique({ where: { id: studentId } }),
    ]);
    if (!event) throw new Error(`event ${eventId} not found`);
    if (!student) throw new Error(`student ${studentId} not found`);

    // TODO: geofence check (Haversine between scan.lat/lng and
    // event.lat/lng vs event.radiusMeters + GEOFENCE_MAX_DISTANCE_METERS)
    // and rule engine (Warning generation) in the next phase.

    const attendance = await prisma.attendanceLog.upsert({
      where: { idempotencyKey: key },
      create: {
        eventId,
        studentId,
        scanCode: scan.scanCode ?? "",
        lat: scan.lat ?? 0,
        lng: scan.lng ?? 0,
        gpsVerified: false,
        idempotencyKey: key,
        ipAddress: scan.ipAddress,
        deviceId: scan.deviceId,
      },
      update: {},
    });

    // Real-time fan-out through Redis so whichever API instance holds
    // the student's SSE stream delivers the update.
    void sseHub
      .publish(`sse:${studentId}`, {
        type: "attendance.recorded",
        attendanceId: attendance.id,
        eventId,
        status: attendance.status,
        ts: Date.now(),
      })
      .catch((err) =>
        logger.warn(`[worker] sse publish failed: ${(err as Error).message}`),
      );

    logger.info(
      `[worker] attendance recorded student=${studentId} event=${eventId}`,
    );
  } catch (err) {
    // Release the lock so the retry attempt can reprocess the scan.
    await redisClient.releaseIdempotencyLock(key).catch(() => undefined);

    if ((err as NodeJS.ErrnoException & { fatal?: boolean }).fatal) {
      throw Object.assign(err as Error, { noRetry: true });
    }
    // Unique violation on (eventId, studentId) = already recorded.
    const code = (err as { code?: string }).code;
    if (code === "P2002") {
      attendanceEventsConsumed.inc({ result: "duplicate" });
      return;
    }
    throw err;
  }
}

async function bootstrap(): Promise<void> {
  redisClient.connect();
  await rabbitClient.connect();
  await rabbitClient.consume("attendance.scan.queue", handleScan);

  await new Promise<void>((resolve) => healthServer.listen(HEALTH_PORT, resolve));
  trackConnectionGauges();
  logger.info(`[worker] consumer bootstrap - ready (health on :${HEALTH_PORT})`);
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`[worker] ${signal} received - starting graceful shutdown`);

  // 1. Stop the health endpoint and stop pulling new messages first.
  healthServer.close();
  await rabbitClient.stopConsuming();

  try {
    // 2. Close connections; unacked in-flight messages are redelivered.
    await rabbitClient.close();
    await redisClient.close();
    await sseHub.close();
    await prisma.$disconnect();
    logger.info("[worker] graceful shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error(`[worker] shutdown error: ${(err as Error).message}`);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

bootstrap().catch((err) => {
  logger.error(`bootstrap failed: ${(err as Error).message}`);
  process.exit(1);
});
