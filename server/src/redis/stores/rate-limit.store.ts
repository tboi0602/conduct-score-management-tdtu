import { REDIS_CONFIG } from "@redis/config";
import { redisConnection } from "@redis/connection";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

export async function rateLimit(
  key: string,
  max = REDIS_CONFIG.rateLimitMax,
  windowSec = REDIS_CONFIG.rateLimitWindowSec,
): Promise<RateLimitResult> {
  const now = Date.now();
  const bucket = `rl:${key}`;
  const transaction = redisConnection.getClient().multi();
  transaction.zremrangebyscore(bucket, 0, now - windowSec * 1000);
  transaction.zadd(bucket, now, `${now}-${Math.random().toString(36).slice(2, 8)}`);
  transaction.zcard(bucket);
  transaction.expire(bucket, windowSec);
  const results = await transaction.exec();

  const count = (results?.[2]?.[1] as number) ?? 0;
  const allowed = count <= max;
  return {
    allowed,
    remaining: Math.max(max - count, 0),
    retryAfterSec: allowed ? 0 : windowSec,
  };
}
