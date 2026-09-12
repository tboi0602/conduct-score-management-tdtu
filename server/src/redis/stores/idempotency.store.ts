import { REDIS_CONFIG } from "@redis/config";
import { redisConnection } from "@redis/connection";

export async function acquireIdempotencyLock(key: string, ttlSec?: number): Promise<boolean> {
  const result = await redisConnection
    .getClient()
    .set(`idem:${key}`, "1", "EX", ttlSec ?? REDIS_CONFIG.idempotencyTtlSec, "NX");
  return result === "OK";
}

export function releaseIdempotencyLock(key: string): Promise<number> {
  return redisConnection.getClient().del(`idem:${key}`);
}
