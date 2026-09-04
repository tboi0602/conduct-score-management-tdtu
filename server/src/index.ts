import "dotenv/config";
import http from "http";
import express from "express";
import helmet from "helmet";
import cors from "cors";

import { logger } from "@config/logger";
import { redisClient } from "@redis";
import { rabbitClient } from "@rabbitmq";
import { prisma } from "@config/prisma";
import { registry } from "@metrics";
import { errorHandler, metricsMiddleware } from "@middleware";
import { router } from "@routes";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const app = express();
// Chỉ tin một reverse proxy trực tiếp (Nginx) để req.ip dùng đúng client IP.
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Đo lường Prometheus + endpoint scrape (chỉ nội bộ:
// Nginx không proxy /metrics ra bên ngoài).
app.use(metricsMiddleware);
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use("/api/v1", router);
app.use(errorHandler);

const server = http.createServer(app);

async function main(): Promise<void> {
  server.listen(PORT, () => {
    logger.info(`[api] listening on :${PORT}`);
  });
}

// Graceful shutdown: đóng dần theo thứ tự an toàn khi nhận SIGTERM/SIGINT
// (docker stop, scale down...), tránh cắt đứt request đang xử lý dở.
async function shutdown(signal: string): Promise<void> {
  logger.info(`[api] ${signal} received - starting graceful shutdown`);

  // 1. Ngừng nhận kết nối mới và chờ các request hiện tại xử lý xong.
  server.close(async () => {
    try {
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

  // 2. Nếu kết nối không tự thoát được thì ép thoát sau 10s.
  setTimeout(() => {
    logger.error("[api] graceful shutdown timed out - forcing exit");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

main().catch((err) => {
  logger.error(`bootstrap failed: ${(err as Error).message}`);
  process.exit(1);
});
