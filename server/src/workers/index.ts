import "dotenv/config";
import http from "http";

import { logger } from "@config/logger";
import { redisClient } from "@redis";
import { rabbitClient } from "@rabbitmq";
import { registry, rabbitConnected, redisConnected } from "@metrics";

// Port cho server health/metrics của worker.
const HEALTH_PORT = parseInt(process.env.WORKER_HEALTH_PORT ?? "9101", 10);

// ============================================================
// Endpoint health cho Docker healthcheck + /metrics cho Prometheus.
// Worker chỉ "khỏe" khi cả RabbitMQ và Redis đều đã nối.
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

// Cập nhật gauge trạng thái kết nối định kỳ để Prometheus scrape.
function trackConnectionGauges(): void {
  setInterval(() => {
    rabbitConnected.set(rabbitClient.isConnected() ? 1 : 0);
    redisConnected.set(
      redisClient.getClient().status === "ready" ? 1 : 0,
    );
  }, 5_000).unref();
}

async function bootstrap(): Promise<void> {
  redisClient.connect();
  await rabbitClient.connect();

  // TODO: consume("attendance.scan.queue", handler) - logic xử lý
  // điểm danh (idempotency, geofence, ghi DB, rule engine...)
  // sẽ được bổ sung tại đây theo nghiệp vụ của bạn.

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
    await redisClient.close();
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
