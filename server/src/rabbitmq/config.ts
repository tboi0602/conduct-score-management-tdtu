import type { Options } from "amqplib";

import { logger } from "@config/logger";

export type QueueConfig = {
  name: string;
  options: Options.AssertQueue;
  bindings: { routingKey: string; exchange: string }[];
};

export const DLX_EXCHANGE = "conduct-score.dlx";
export const RETRY_EXCHANGE = "conduct-score.retry";
export const DLQ_ROUTING_KEY = "attendance.scan.dead.v1";
const MAIN_EXCHANGE = process.env.RABBITMQ_EXCHANGE ?? "conduct-score.events";

export const RABBITMQ_CONFIG = {
  url: (() => {
    const url = process.env.RABBITMQ_URL;
    if (url) return url;
    if (process.env.NODE_ENV === "production") {
      throw new Error("[rabbitmq] RABBITMQ_URL is required in production");
    }
    logger.warn("[rabbitmq] RABBITMQ_URL not set - using local development default");
    return "amqp://guest:guest@localhost:5672";
  })(),
  exchange: MAIN_EXCHANGE,
  prefetch: Number(process.env.RABBITMQ_PREFETCH ?? 20),
  maxRetries: Number(process.env.RABBITMQ_MAX_RETRIES ?? 3),
  reconnect: {
    retries: Number(process.env.RABBITMQ_RETRIES ?? 10),
    baseDelayMs: 2000,
    maxDelayMs: 30000,
  },
  queues: {
    attendance: {
      name: "attendance.scan.queue",
      options: {
        durable: true,
        messageTtl: 86_400_000,
        deadLetterExchange: DLX_EXCHANGE,
        deadLetterRoutingKey: DLQ_ROUTING_KEY,
      },
      bindings: [{ routingKey: "attendance.scan.requested.v1", exchange: MAIN_EXCHANGE }],
    },
    retry5s: {
      name: "attendance.scan.retry.5s",
      options: {
        durable: true,
        messageTtl: 5_000,
        deadLetterExchange: MAIN_EXCHANGE,
        deadLetterRoutingKey: "attendance.scan.requested.v1",
      },
      bindings: [{ routingKey: "retry.5s", exchange: RETRY_EXCHANGE }],
    },
    retry30s: {
      name: "attendance.scan.retry.30s",
      options: {
        durable: true,
        messageTtl: 30_000,
        deadLetterExchange: MAIN_EXCHANGE,
        deadLetterRoutingKey: "attendance.scan.requested.v1",
      },
      bindings: [{ routingKey: "retry.30s", exchange: RETRY_EXCHANGE }],
    },
    dlq: {
      name: "attendance.scan.queue.dlq",
      options: { durable: true },
      bindings: [{ routingKey: DLQ_ROUTING_KEY, exchange: DLX_EXCHANGE }],
    },
  } satisfies Record<string, QueueConfig>,
} as const;
