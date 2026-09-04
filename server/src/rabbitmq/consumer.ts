import type { ConfirmChannel, ConsumeMessage } from "amqplib";

import { logger } from "@config/logger";
import { attendanceEventsConsumed } from "@metrics";
import { RABBITMQ_CONFIG, RETRY_EXCHANGE } from "@rabbitmq/config";
import { rabbitConnection } from "@rabbitmq/connection";

export type MessageHandler = (
  payload: Record<string, unknown>,
  message: ConsumeMessage,
) => Promise<void>;

class RabbitConsumer {
  private queue: string | null = null;
  private handler: MessageHandler | null = null;
  private consumerTag: string | null = null;
  private unsubscribeReady: (() => void) | null = null;

  async consume(queue: string, handler: MessageHandler): Promise<void> {
    await this.stop();
    this.queue = queue;
    this.handler = handler;
    this.unsubscribeReady = rabbitConnection.onReady(() => this.subscribe());
    await this.subscribe();
  }

  async stop(): Promise<void> {
    this.unsubscribeReady?.();
    this.unsubscribeReady = null;
    const channel = rabbitConnection.getChannel();
    if (channel && this.consumerTag) {
      await channel.cancel(this.consumerTag).catch(() => undefined);
      logger.info("[rabbitmq] consumer cancelled");
    }
    this.consumerTag = null;
    this.queue = null;
    this.handler = null;
  }

  private async subscribe(): Promise<void> {
    const channel = rabbitConnection.getChannel();
    if (!channel || !this.queue || !this.handler) return;
    const queue = this.queue;
    const handler = this.handler;

    const result = await channel.consume(queue, async (message) => {
      if (!message) return;
      try {
        const payload = JSON.parse(message.content.toString("utf-8")) as Record<string, unknown>;
        await handler(payload, message);
        channel.ack(message);
        attendanceEventsConsumed.inc({ result: "ack" });
      } catch (error) {
        logger.error(`[rabbitmq] handler failed: ${(error as Error).message}`);
        routeToRetry(channel, message, error as Error);
      }
    });
    this.consumerTag = result.consumerTag;
    logger.info(`[rabbitmq] consuming queue: ${queue}`);
  }
}

function routeToRetry(channel: ConfirmChannel, message: ConsumeMessage, error: Error): void {
  if ((error as Error & { noRetry?: boolean }).noRetry) {
    channel.nack(message, false, false);
    attendanceEventsConsumed.inc({ result: "dlq" });
    return;
  }

  const attempt = (message.properties.headers?.["x-retry-count"] as number | undefined) ?? 0;
  if (attempt >= RABBITMQ_CONFIG.maxRetries) {
    logger.error(`[rabbitmq] message dead-lettered after ${attempt} retries`);
    channel.nack(message, false, false);
    attendanceEventsConsumed.inc({ result: "dlq" });
    return;
  }

  channel.publish(
    RETRY_EXCHANGE,
    attempt === 0 ? "retry.5s" : "retry.30s",
    message.content,
    {
      persistent: true,
      contentType: message.properties.contentType,
      headers: { ...message.properties.headers, "x-retry-count": attempt + 1 },
    },
    (publishError) => {
      if (publishError) return channel.nack(message, false, true);
      channel.ack(message);
      attendanceEventsConsumed.inc({ result: "retry" });
    },
  );
}

export const rabbitConsumer = new RabbitConsumer();
