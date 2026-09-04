import Redis, { type RedisOptions } from "ioredis";

import { logger } from "@config/logger";
import { REDIS_CONFIG } from "@redis/config";

class RedisConnection {
  private client: Redis | null = null;
  private isClosedByUs = false;

  connect(): Redis {
    if (this.client) return this.client;
    this.isClosedByUs = false;

    const options: RedisOptions = {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
      retryStrategy: (attempt) => {
        const delay = Math.min(attempt * 1000, 30000);
        logger.warn(`[redis] retrying connection (attempt ${attempt}) in ${delay}ms`);
        return delay;
      },
      reconnectOnError: (error) => {
        const reconnect = ["READONLY", "LOADING", "MAXMEMORY"].some((code) =>
          error.message.includes(code),
        );
        if (reconnect) logger.warn(`[redis] reconnect on error: ${error.message}`);
        return reconnect;
      },
    };

    this.client = new Redis(REDIS_CONFIG.url, options);
    this.client.on("connect", () => logger.info("[redis] connection established"));
    this.client.on("ready", () => logger.info("[redis] connected & ready"));
    this.client.on("error", (error) => logger.error(`[redis] error: ${error.message}`));
    this.client.on("close", () => {
      if (!this.isClosedByUs) logger.warn("[redis] connection closed - retry scheduled");
    });
    this.client.on("end", () => logger.warn("[redis] connection ended"));
    return this.client;
  }

  getClient(): Redis {
    return this.client ?? this.connect();
  }

  async close(): Promise<void> {
    this.isClosedByUs = true;
    await this.client?.quit();
    this.client = null;
  }
}

export const redisConnection = new RedisConnection();
