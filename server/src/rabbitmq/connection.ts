import amqp, { type ChannelModel, type ConfirmChannel } from "amqplib";

import { logger } from "@config/logger";
import { rabbitConnected } from "@metrics";
import { RABBITMQ_CONFIG } from "@rabbitmq/config";
import { assertTopology } from "@rabbitmq/topology";

type ReadyListener = () => Promise<void>;

class RabbitConnection {
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;
  private reconnecting = false;
  private closedByUs = false;
  private retryCount = 0;
  private readyListeners = new Set<ReadyListener>();

  async connect(): Promise<ConfirmChannel> {
    if (this.channel) return this.channel;
    this.closedByUs = false;

    const connection = await amqp.connect(RABBITMQ_CONFIG.url, {
      heartbeat: 60,
      timeout: 15000,
    });
    this.connection = connection;
    connection.on("error", (error) => logger.error(`[rabbitmq] connection error: ${error.message}`));
    connection.on("close", () => this.handleUnexpectedClose("connection"));

    const channel = await connection.createConfirmChannel();
    this.channel = channel;
    channel.prefetch(RABBITMQ_CONFIG.prefetch);
    channel.on("error", (error) => logger.error(`[rabbitmq] channel error: ${error.message}`));
    channel.on("close", () => this.handleUnexpectedClose("channel"));

    await assertTopology(channel);
    this.retryCount = 0;
    this.reconnecting = false;
    rabbitConnected.set(1);
    logger.info("[rabbitmq] connected & topology asserted");
    return channel;
  }

  getChannel(): ConfirmChannel | null {
    return this.channel;
  }

  isConnected(): boolean {
    return this.connection !== null && this.channel !== null && !this.closedByUs;
  }

  onReady(listener: ReadyListener): () => void {
    this.readyListeners.add(listener);
    return () => this.readyListeners.delete(listener);
  }

  async close(): Promise<void> {
    this.closedByUs = true;
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // Connection may already be closed.
    }
    this.channel = null;
    this.connection = null;
    rabbitConnected.set(0);
  }

  private handleUnexpectedClose(source: string): void {
    rabbitConnected.set(0);
    if (this.closedByUs) return;
    logger.error(`[rabbitmq] ${source} closed - scheduling reconnect`);
    this.channel = null;
    this.connection = null;
    void this.reconnect();
  }

  private async reconnect(): Promise<void> {
    if (this.reconnecting || this.closedByUs) return;
    this.reconnecting = true;

    while (!this.closedByUs && this.retryCount < RABBITMQ_CONFIG.reconnect.retries) {
      const delay = Math.min(
        RABBITMQ_CONFIG.reconnect.baseDelayMs * 2 ** Math.min(this.retryCount, 5),
        RABBITMQ_CONFIG.reconnect.maxDelayMs,
      );
      this.retryCount += 1;
      logger.warn(`[rabbitmq] reconnect attempt ${this.retryCount} in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        await this.connect();
        for (const listener of this.readyListeners) await listener();
        return;
      } catch (error) {
        logger.error(`[rabbitmq] reconnect failed: ${(error as Error).message}`);
        this.channel = null;
        this.connection = null;
      }
    }

    if (!this.closedByUs) {
      logger.error("[rabbitmq] max reconnect attempts reached - exiting");
      process.exit(1);
    }
  }
}

export const rabbitConnection = new RabbitConnection();
