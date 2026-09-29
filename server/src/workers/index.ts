import "dotenv/config";
import http from "http";

import { logger } from "@config/logger";
import { env, validateRuntimeEnv } from "@config/env";
import { redisClient } from "@redis";
import { withLock } from "@redis/stores/lock.store";
import { rabbitClient } from "@rabbitmq";
import { registry, rabbitConnected, redisConnected } from "@metrics";
import { RABBITMQ_CONFIG } from "@rabbitmq";
import { handleAttendanceMessage } from "@workers/attendance.worker";
import { startOutboxRelay } from "@modules/infrastructure";
import { prisma } from "@config/prisma";
import { sseHub } from "@realtime/sse";
import { cleanupResolvedAppeals, reconcileApprovedAppealScores } from "@modules/appeals";
import { syncEndedEventConductScores } from "@modules/conduct-score";
import { cleanupAttendanceEvidence, evaluateConductScoreWarnings } from "@modules/warnings";

// Port cho server health/metrics cá»§a worker.
// ============================================================
// Endpoint health cho Docker healthcheck + /metrics cho Prometheus.
// Worker chá»‰ "khá»e" khi cáº£ RabbitMQ vÃ  Redis Ä‘á»u Ä‘Ã£ ná»‘i.
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

// Cáº­p nháº­t gauge tráº¡ng thÃ¡i káº¿t ná»‘i Ä‘á»‹nh ká»³ Ä‘á»ƒ Prometheus scrape.
function trackConnectionGauges(): void {
  setInterval(() => {
    rabbitConnected.set(rabbitClient.isConnected() ? 1 : 0);
    redisConnected.set(redisClient.getClient().status === "ready" ? 1 : 0);
  }, 5_000).unref();
}

function runExclusiveJob(name: string, ttlMs: number, task: () => Promise<void>): void {
  void withLock(`worker-job:${name}`, ttlMs, task).catch((error: unknown) =>
    logger.error(`[${name}] scheduled job failed: ${(error as Error).message}`),
  );
}

function startAppealCleanup(): void {
  const intervalMs = env.appealCleanupIntervalMs;
  const run = () =>
    runExclusiveJob("appeals", Math.min(intervalMs, 30 * 60 * 1000), async () => {
      await reconcileApprovedAppealScores();
      const count = await cleanupResolvedAppeals();
      if (count > 0) logger.info(`[appeals] cleaned ${count} resolved appeals`);
    });
  run();
  setInterval(run, intervalMs).unref();
}

function startEndedEventScoreSync(): void {
  const intervalMs = env.conductScoreSyncIntervalMs;
  const run = () =>
    runExclusiveJob("conduct-score-sync", Math.min(intervalMs, 25_000), async () => {
      const count = await syncEndedEventConductScores();
      if (count > 0) logger.info(`[conduct-score] synchronized ${count} ended event scores`);
    });
  run();
  setInterval(run, intervalMs).unref();
}

function startWarningMaintenance(): void {
  const intervalMs = env.warningMaintenanceIntervalMs;
  const run = () =>
    runExclusiveJob("warning-maintenance", Math.min(intervalMs, 60 * 60 * 1000), async () => {
      const created = await evaluateConductScoreWarnings();
      const cleaned = await cleanupAttendanceEvidence();
      if (created || cleaned) logger.info(`[warnings] created=${created} cleaned=${cleaned}`);
    });
  run();
  setInterval(run, intervalMs).unref();
}

async function bootstrap(): Promise<void> {
  validateRuntimeEnv();
  redisClient.connect();
  await prisma.$connect();
  await rabbitClient.connect();

  await rabbitClient.consume(RABBITMQ_CONFIG.queues.attendance.name, handleAttendanceMessage);
  startOutboxRelay();
  startAppealCleanup();
  startEndedEventScoreSync();
  startWarningMaintenance();

  await new Promise<void>((resolve) => healthServer.listen(env.workerHealthPort, resolve));
  trackConnectionGauges();
  logger.info(`[worker] consumer bootstrap - ready (health on :${env.workerHealthPort})`);
}

// Graceful shutdown: ngá»«ng nháº·t message TRÆ¯á»šC rá»“i má»›i Ä‘Ã³ng káº¿t ná»‘i,
// message dá»Ÿ dang chÆ°a ack sáº½ Ä‘Æ°á»£c RabbitMQ giao láº¡i cho worker khÃ¡c.
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
