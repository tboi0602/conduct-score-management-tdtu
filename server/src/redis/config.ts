export const REDIS_CONFIG = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
  idempotencyTtlSec: Number(process.env.REDIS_IDEMPOTENCY_TTL ?? 86400),
  lockTtlMs: Number(process.env.REDIS_LOCK_TTL_MS ?? 1000),
  cacheTtlSec: Number(process.env.REDIS_CACHE_TTL ?? 300),
  rateLimitWindowSec: Number(process.env.REDIS_RATE_LIMIT_WINDOW ?? 10),
  rateLimitMax: Number(process.env.REDIS_RATE_LIMIT_MAX ?? 10),
} as const;
