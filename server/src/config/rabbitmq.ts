import amqp, {
  Channel,
  ConsumeMessage,
  ConfirmChannel,
  Options,
} from "amqplib";

import { logger } from "./logger";
import { attendanceEventsConsumed, rabbitConnected } from "../metrics";

type ExchangeConfig = {
  name: string;
  type: "direct";
  options: Options.AssertExchange;
};

type QueueConfig = {
  name: string;
  options: Options.AssertQueue;
  bindings: { routingKey: string; exchange: string }[];
};

/**
 * Topology (single source of truth - asserted by this client on boot):
 *
 *   attendance.events --(attendance.scanned)--> attendance.scan.queue
 *   attendance.scan.queue --[nack, retries exhausted]--> attendance.dlx
 *   attendance.dlx --(attendance.scan.dead)----> attendance.scan.queue.dlq
 *
 *   attendance.retry --(retry.5s)--> attendance.scan.retry.5s  --[TTL]--> attendance.events
 *   attendance.retry --(retry.30s)--> attendance.scan.retry.30s --[TTL]--> attendance.events
 *
 * Failed messages are retried with 5s then 30s TTL backoff (per consume
 * attempt) before being dead-lettered, so the DLQ only holds messages
 * that genuinely need operator attention.
 */
const DLX_EXCHANGE = "attendance.dlx";
const RETRY_EXCHANGE = "attendance.retry";
const DLQ_ROUTING_KEY = "attendance.scan.dead";

export const RABBITMQ_CONFIG = {
  url: (() => {
    const url = process.env.RABBITMQ_URL;
    if (!url) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("[rabbitmq] RABBITMQ_URL is required in production");
      }
      logger.warn(
        "[rabbitmq] RABBITMQ_URL not set - falling back to local dev default",
      );
      return "amqp://guest:guest@localhost:5672";
    }
    return url;
  })(),
  exchange: {
    name: process.env.RABBITMQ_EXCHANGE ?? "attendance.events",
    type: "direct",
    options: { durable: true },
  } as ExchangeConfig,
  queues: {
    attendance: {
      name: "attendance.scan.queue",
      options: {
        durable: true,
        messageTtl: 86_400_000,
        deadLetterExchange: DLX_EXCHANGE,
        deadLetterRoutingKey: DLQ_ROUTING_KEY,
      },
      bindings: [
        { routingKey: "attendance.scanned", exchange: "attendance.events" },
      ],
    } as QueueConfig,
    retry5s: {
      name: "attendance.scan.retry.5s",
      options: {
        durable: true,
        messageTtl: 5_000,
        deadLetterExchange: "attendance.events",
        deadLetterRoutingKey: "attendance.scanned",
      },
      bindings: [{ routingKey: "retry.5s", exchange: RETRY_EXCHANGE }],
    } as QueueConfig,
    retry30s: {
      name: "attendance.scan.retry.30s",
      options: {
        durable: true,
        messageTtl: 30_000,
        deadLetterExchange: "attendance.events",
        deadLetterRoutingKey: "attendance.scanned",
      },
      bindings: [{ routingKey: "retry.30s", exchange: RETRY_EXCHANGE }],
    } as QueueConfig,
    dlq: {
      name: "attendance.scan.queue.dlq",
      options: { durable: true },
      bindings: [{ routingKey: DLQ_ROUTING_KEY, exchange: DLX_EXCHANGE }],
    } as QueueConfig,
  },
  prefetch: parseInt(process.env.RABBITMQ_PREFETCH ?? "20", 10),
  maxRetries: parseInt(process.env.RABBITMQ_MAX_RETRIES ?? "3", 10),
  reconnect: {
    retries: parseInt(process.env.RABBITMQ_RETRIES ?? "10", 10),
    baseDelayMs: 2000,
    maxDelayMs: 30000,
  },
};

type MessageHandler = (
  payload: Record<string, unknown>,
  msg: ConsumeMessage,
) => Promise<void>;

class RabbitMQClient {
  private connection: import("amqplib").ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;
  private retryCount = 0;
  private isReconnecting = false;
  private isClosedByUs = false;
  private consumerTag: string | null = null;
  private isConsuming = false;

  async connect(): Promise<ConfirmChannel> {
    if (this.isReconnecting) {
      logger.warn("[rabbitmq] reconnect already in progress");
      return this.channel!;
    }

    try {
      const connection = await amqp.connect(RABBITMQ_CONFIG.url, {
        heartbeat: 60,
        timeout: 15000,
      });
      this.connection = connection;

      connection.on("error", (err) => {
        logger.error(`[rabbitmq] connection error: ${err.message}`);
      });

      connection.on("close", () => {
        rabbitConnected.set(0);
        if (this.isClosedByUs) return;
        logger.error("[rabbitmq] connection closed - scheduling reconnect");
        void this.reconnect();
      });

      const channel = await connection.createConfirmChannel();
      this.channel = channel;
      channel.prefetch(RABBITMQ_CONFIG.prefetch);
      channel.on("error", (err) => {
        logger.error(`[rabbitmq] channel error: ${err.message}`);
      });
      channel.on("close", () => {
        logger.error("[rabbitmq] channel closed - scheduling reconnect");
        if (!this.isClosedByUs) void this.reconnect();
      });

      await this.assertTopology();
      this.retryCount = 0;
      this.isReconnecting = false;
      rabbitConnected.set(1);
      logger.info("[rabbitmq] connected & topology asserted");
      return channel;
    } catch (err) {
      rabbitConnected.set(0);
      logger.error(`[rabbitmq] connect failed: ${(err as Error).message}`);
      if (!this.isReconnecting) await this.reconnect();
      throw err;
    }
  }

  async assertTopology(): Promise<void> {
    const ch = this.channel;
    if (!ch) throw new Error("[rabbitmq] channel not ready");

    await ch.assertExchange(RABBITMQ_CONFIG.exchange.name, "direct", {
      ...RABBITMQ_CONFIG.exchange.options,
    });
    await ch.assertExchange(DLX_EXCHANGE, "direct", { durable: true });
    await ch.assertExchange(RETRY_EXCHANGE, "direct", { durable: true });

    for (const queue of Object.values(RABBITMQ_CONFIG.queues)) {
      await ch.assertQueue(queue.name, queue.options);
      for (const binding of queue.bindings) {
        await ch.bindQueue(queue.name, binding.exchange, binding.routingKey);
      }
    }
  }

  /** Publish to the direct exchange with publisher confirms. */
  publish(
    routingKey: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const ch = this.channel;
      if (!ch) {
        reject(new Error("[rabbitmq] publish before connect"));
        return;
      }
      const buffer = Buffer.from(JSON.stringify(payload));
      ch.publish(
        RABBITMQ_CONFIG.exchange.name,
        routingKey,
        buffer,
        {
          persistent: true, // durable on disk
          contentType: "application/json",
          messageId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: Math.floor(Date.now() / 1000),
        },
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }

  /**
   * Consume with manual ack. Handler failures are retried with TTL
   * backoff (5s, then 30s per attempt); once the retry budget is
   * exhausted the message is dead-lettered to the DLQ.
   */
  async consume(queue: string, handler: MessageHandler): Promise<void> {
    const ch = this.channel;
    if (!ch) throw new Error("[rabbitmq] consume before connect");
    this.isConsuming = true;

    const { consumerTag } = await ch.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString("utf-8"));
        await handler(payload, msg);
        ch.ack(msg);
        attendanceEventsConsumed.inc({ result: "ack" });
      } catch (err) {
        logger.error(
          `[rabbitmq] handler failed: ${(err as Error).message} - scheduling retry`,
        );
        this.routeToRetry(ch, msg, err as Error);
      }
    });
    this.consumerTag = consumerTag;
    logger.info(`[rabbitmq] consuming queue: ${queue}`);
  }

  private routeToRetry(
    ch: ConfirmChannel,
    msg: ConsumeMessage,
    err: Error,
  ): void {
    // Handler marked the failure as fatal (e.g. malformed payload):
    // retrying can never succeed - dead-letter immediately.
    if ((err as Error & { noRetry?: boolean }).noRetry) {
      logger.error(`[rabbitmq] fatal handler error, dead-lettering: ${err.message}`);
      ch.nack(msg, false, false);
      attendanceEventsConsumed.inc({ result: "dlq" });
      return;
    }

    const attempt =
      (msg.properties.headers?.["x-retry-count"] as number | undefined) ?? 0;
    if (attempt >= RABBITMQ_CONFIG.maxRetries) {
      logger.error(
        `[rabbitmq] message dead-lettered after ${attempt} retries: ${err.message}`,
      );
      ch.nack(msg, false, false); // -> attendance.dlx -> DLQ
      attendanceEventsConsumed.inc({ result: "dlq" });
      return;
    }

    const routingKey = attempt === 0 ? "retry.5s" : "retry.30s";
    ch.publish(
      RETRY_EXCHANGE,
      routingKey,
      msg.content,
      {
        persistent: true,
        contentType: msg.properties.contentType,
        headers: { ...msg.properties.headers, "x-retry-count": attempt + 1 },
      },
      (publishErr) => {
        if (publishErr) {
          // Broker did not accept the retry copy - requeue the original.
          ch.nack(msg, false, true);
          return;
        }
        ch.ack(msg);
        attendanceEventsConsumed.inc({ result: "retry" });
      },
    );
  }

  /**
   * Stop consuming without closing the connection. Used during graceful
   * shutdown so in-flight messages are not acked mid-processing.
   */
  async stopConsuming(): Promise<void> {
    const ch = this.channel;
    if (ch && this.consumerTag && this.isConsuming) {
      await ch.cancel(this.consumerTag).catch(() => undefined);
      logger.info("[rabbitmq] consumer cancelled");
    }
    this.isConsuming = false;
    this.consumerTag = null;
  }

  async close(): Promise<void> {
    this.isClosedByUs = true;
    await this.stopConsuming();
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // connection may already be dead
    }
    this.channel = null;
    this.connection = null;
    rabbitConnected.set(0);
  }

  isConnected(): boolean {
    return this.connection !== null && !this.isClosedByUs;
  }

  private async reconnect(): Promise<void> {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this.channel = null;
    this.connection = null;

    const delay = Math.min(
      RABBITMQ_CONFIG.reconnect.baseDelayMs *
        2 ** Math.min(this.retryCount, 5),
      RABBITMQ_CONFIG.reconnect.maxDelayMs,
    );

    logger.warn(
      `[rabbitmq] reconnect attempt ${this.retryCount + 1} in ${delay}ms`,
    );
    await new Promise((r) => setTimeout(r, delay));

    this.retryCount += 1;
    if (this.retryCount > RABBITMQ_CONFIG.reconnect.retries) {
      logger.error("[rabbitmq] max reconnect attempts reached - giving up");
      process.exit(1);
    }

    try {
      await this.connect();
    } catch (err) {
      logger.error(`[rabbitmq] reconnect failed: ${(err as Error).message}`);
    }
  }

  getChannel(): ConfirmChannel | null {
    return this.channel;
  }
}

export const rabbitClient = new RabbitMQClient();
