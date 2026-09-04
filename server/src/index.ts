import "dotenv/config";
import http from "http";
import express from "express";
import helmet from "helmet";
import cors from "cors";

import { logger } from "./config/logger";
import { redisClient } from "./config/redis";
import { rabbitClient } from "./config/rabbitmq";
import { prisma } from "./config/prisma";
import { registry } from "./metrics";
import { metricsMiddleware } from "./middleware";
import { router } from "./routes";
import { sseHub } from "./realtime/sse";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Prometheus instrumentation + scrape endpoint (internal only:
// Nginx does not proxy /metrics to the outside).
app.use(metricsMiddleware);
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use("/api/v1", router);

const server = http.createServer(app);

async function main(): Promise<void> {
  server.listen(PORT, () => {
    logger.info(`[api] listening on :${PORT}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`[api] ${signal} received - starting graceful shutdown`);

  // 1. Stop accepting new connections and drain in-flight requests.
  server.close(async () => {
    try {
      await sseHub.close();
      await rabbitClient.close();
      await redisClient.close();
      await prisma.$disconnect();
      logger.info("[api] graceful shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error(`[api] shutdown error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

  // 2. Force-exit if connections refuse to drain.
  setTimeout(() => {
    logger.error("[api] graceful shutdown timed out - forcing exit");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

main().catch((err) => {
  logger.error(`bootstrap failed: ${(err as Error).message}`);
  process.exit(1);
});
