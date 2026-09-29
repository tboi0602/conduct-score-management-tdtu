import { env } from "@config/env";

export const REDIS_CONFIG = {
  url: env.redisUrl,
  idempotencyTtlSec: env.redisIdempotencyTtl,
  lockTtlMs: env.redisLockTtlMs,
  cacheTtlSec: env.redisCacheTtl,
  rateLimitWindowSec: env.redisRateLimitWindow,
  rateLimitMax: env.redisRateLimitMax,
} as const;
