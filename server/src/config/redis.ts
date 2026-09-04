import Redis, { type RedisOptions } from "ioredis";
import { logger } from "./logger";

export const REDIS_CONFIG = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
  idempotencyTtlSec: parseInt(
    process.env.REDIS_IDEMPOTENCY_TTL ?? "86400",
    10,
  ),
  lockTtlMs: parseInt(process.env.REDIS_LOCK_TTL_MS ?? "1000", 10),
  cacheTtlSec: parseInt(process.env.REDIS_CACHE_TTL ?? "300", 10),
  rateLimitWindowSec: parseInt(
    process.env.REDIS_RATE_LIMIT_WINDOW ?? "10",
    10,
  ),
  rateLimitMax: parseInt(process.env.REDIS_RATE_LIMIT_MAX ?? "10", 10),
} as const;

type ParserResult = { ok: true; data: unknown } | { ok: false };

function safeParse(raw: string | null): ParserResult {
  if (!raw) return { ok: false };
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

class RedisClient {
  private client: Redis | null = null;
  private retryCount = 0;
  private isClosedByUs = false;

  connect(): Redis {
    if (this.client) return this.client;

    const opts: RedisOptions = {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
      retryStrategy: (times: number) => {
        // Exponential backoff capped at 30s.
        const delay = Math.min(times * 1000, 30000);
        logger.warn(
          `[redis] retrying connection (attempt ${times}) in ${delay}ms`,
        );
        return delay;
      },
      reconnectOnError: (err: Error) => {
        const target = ["READONLY", "LOADING", "MAXMEMORY"].some((e) =>
          err.message.includes(e),
        );
        if (target) logger.warn(`[redis] reconnect on error: ${err.message}`);
        return target;
      },
    };

    this.client = new Redis(REDIS_CONFIG.url, opts);

    this.client.on("ready", () => {
      this.retryCount = 0;
      logger.info("[redis] connected & ready");
    });
    this.client.on("connect", () =>
      logger.info("[redis] connection established"),
    );
    this.client.on("error", (err) =>
      logger.error(`[redis] error: ${err.message}`),
    );
    this.client.on("close", () => {
      if (!this.isClosedByUs) {
        logger.warn("[redis] connection closed - retry scheduled");
      }
    });
    this.client.on("reconnecting", () => {
      this.retryCount += 1;
    });
    this.client.on("end", () => logger.warn("[redis] connection ended"));

    return this.client;
  }

  // ============================================================
  // Idempotency Lock (SETNX)
  // Guarantees a barcode scan is processed exactly once.
  // ============================================================
  async acquireIdempotencyLock(key: string, ttlSec?: number): Promise<boolean> {
    const result = await this.client!.set(
      `idem:${key}`,
      "1",
      "EX",
      ttlSec ?? REDIS_CONFIG.idempotencyTtlSec,
      "NX",
    );
    return result === "OK";
  }

  async releaseIdempotencyLock(key: string): Promise<number> {
    return this.client!.del(`idem:${key}`);
  }

  // ============================================================
  // Dynamic (sliding-window) rate limiting using sorted sets
  // ============================================================
  async rateLimit(
    key: string,
    max: number = REDIS_CONFIG.rateLimitMax,
    windowSec: number = REDIS_CONFIG.rateLimitWindowSec,
  ): Promise<{ allowed: boolean; remaining: number; retryAfterSec: number }> {
    const now = Date.now();
    const bucket = `rl:${key}`;
    const windowStart = now - windowSec * 1000;

    const multi = this.client!.multi();
    multi.zremrangebyscore(bucket, 0, windowStart); // evict stale entries
    multi.zadd(bucket, now, `${now}-${Math.random().toString(36).slice(2, 8)}`);
    multi.zcard(bucket);
    multi.expire(bucket, windowSec); // auto-clean bucket
    const results = await multi.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;
    const allowed = count <= max;
    return {
      allowed,
      remaining: Math.max(max - count, 0),
      retryAfterSec: allowed ? 0 : Math.ceil((windowStart + windowSec * 1000 - now) / 1000),
    };
  }

  // ============================================================
  // In-memory cache (with JSON-safe TTL handling)
  // ============================================================
  async cacheGet<T>(key: string): Promise<T | null> {
    const res = safeParse(await this.client!.get(`cache:${key}`));
    return res.ok ? (res.data as T) : null;
  }

  async cacheSet(
    key: string,
    value: unknown,
    ttlSec: number = REDIS_CONFIG.cacheTtlSec,
  ): Promise<void> {
    await this.client!.set(`cache:${key}`, JSON.stringify(value), "EX", ttlSec);
  }

  async cacheDel(key: string): Promise<void> {
    await this.client!.del(`cache:${key}`);
  }

  // ============================================================
  // Distributed lock (SETNX with random token + Lua release)
  // ============================================================
  async withLock<T>(
    key: string,
    ttlMs: number,
    task: () => Promise<T>,
  ): Promise<T | null> {
    const token = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const acquired = await this.client!.set(
      `lock:${key}`,
      token,
      "PX",
      ttlMs,
      "NX",
    );
    if (acquired !== "OK") return null;

    try {
      return await task();
    } finally {
      // Lua: only release if token matches (avoids releasing others' lock).
      const lua = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;
      await this.client!.eval(lua, 1, `lock:${key}`, token);
    }
  }

  async close(): Promise<void> {
    this.isClosedByUs = true;
    await this.client?.quit();
  }

  getClient(): Redis {
    return this.client ?? this.connect();
  }
}

export const redisClient = new RedisClient();