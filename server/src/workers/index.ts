import "dotenv/config";
import http from "http";

import { logger } from "@config/logger";
import { redisClient } from "@redis";
import { rabbitClient } from "@rabbitmq";
import { registry, rabbitConnected, redisConnected } from "@metrics";
import { RABBITMQ_CONFIG } from "@rabbitmq";
import { handleAttendanceMessage } from "@workers/attendance.worker";
import { startOutboxRelay } from "@services/infrastructure/outbox.service";
import { prisma } from "@config/prisma";
import { sseHub } from "@realtime/sse";
import {
  cleanupResolvedAppeals,
  reconcileApprovedAppealScores,
} from "@services/appeals/appeal.service";
import { syncEndedEventConductScores } from "@services/conduct-score/conduct-score.service";
import {
  cleanupAttendanceEvidence,
  evaluateConductScoreWarnings,
} from "@services/warnings/warning.service";

// Port cho server health/metrics của worker.
const HEALTH_PORT = parseInt(process.env.WORKER_HEALTH_PORT ?? "9101", 10);

// ============================================================
// Endpoint health cho Docker healthcheck + /metrics cho Prometheus.
// Worker chỉ "khỏe" khi cả RabbitMQ và Redis đều đã nối.
// ============================================================
const healthServer = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    const rabbit = rabbitClient.isConnected();
    const redis = redisClient.getClient().status === "ready";
    const database = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
    const ok = rabbit && redis && database;
    res.writeHead(ok ? 200 : 503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok, rabbit, redis, database, ts: new Date().toISOString() }));
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

// Cập nhật gauge trạng thái kết nối định kỳ để Prometheus scrape.
function trackConnectionGauges(): void {
  setInterval(() => {
    rabbitConnected.set(rabbitClient.isConnected() ? 1 : 0);
    redisConnected.set(redisClient.getClient().status === "ready" ? 1 : 0);
  }, 5_000).unref();
}

function startAppealCleanup(): void {
  const intervalMs = Number(process.env.APPEAL_CLEANUP_INTERVAL_MS ?? 60 * 60 * 1000);
  const run = () =>
    reconcileApprovedAppealScores()
      .then(() => cleanupResolvedAppeals())
      .then((count) => count > 0 && logger.info(`[appeals] cleaned ${count} resolved appeals`))
      .catch((error: unknown) =>
        logger.error(`[appeals] cleanup failed: ${(error as Error).message}`),
      );
  void run();
  setInterval(run, intervalMs).unref();
}

function startEndedEventScoreSync(): void {
  const intervalMs = Number(process.env.CONDUCT_SCORE_EVENT_SYNC_INTERVAL_MS ?? 30_000);
  const run = () =>
    syncEndedEventConductScores()
      .then(
        (count) =>
          count > 0 && logger.info(`[conduct-score] synchronized ${count} ended event scores`),
      )
      .catch((error: unknown) =>
        logger.error(`[conduct-score] ended event sync failed: ${(error as Error).message}`),
      );
  void run();
  setInterval(run, intervalMs).unref();
}

function startWarningMaintenance(): void {
  const intervalMs = Number(process.env.WARNING_MAINTENANCE_INTERVAL_MS ?? 24 * 60 * 60 * 1000);
  const run = () =>
    evaluateConductScoreWarnings()
      .then((created) => cleanupAttendanceEvidence().then((cleaned) => ({ created, cleaned })))
      .then(({ created, cleaned }) => {
        if (created || cleaned) logger.info(`[warnings] created=${created} cleaned=${cleaned}`);
      })
      .catch((error: unknown) =>
        logger.error(`[warnings] maintenance failed: ${(error as Error).message}`),
      );
  void run();
  setInterval(run, intervalMs).unref();
}

async function bootstrap(): Promise<void> {
  redisClient.connect();
  await prisma.$connect();
  await rabbitClient.connect();

  await rabbitClient.consume(RABBITMQ_CONFIG.queues.attendance.name, handleAttendanceMessage);
  startOutboxRelay();
  startAppealCleanup();
  startEndedEventScoreSync();
  startWarningMaintenance();

  await new Promise<void>((resolve) => healthServer.listen(HEALTH_PORT, resolve));
  trackConnectionGauges();
  logger.info(`[worker] consumer bootstrap - ready (health on :${HEALTH_PORT})`);
}

// Graceful shutdown: ngừng nhặt message TRƯỚC rồi mới đóng kết nối,
// message dở dang chưa ack sẽ được RabbitMQ giao lại cho worker khác.
async function shutdown(signal: string): Promise<void> {
  logger.info(`[worker] ${signal} received - starting graceful shutdown`);

  healthServer.close();
  await rabbitClient.stopConsuming();

  try {
    await rabbitClient.close();
    await sseHub.close();
    await redisClient.close();
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
