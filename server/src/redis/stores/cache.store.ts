import { REDIS_CONFIG } from "@redis/config";
import { redisConnection } from "@redis/connection";

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redisConnection.getClient().get(`cache:${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSec = REDIS_CONFIG.cacheTtlSec,
): Promise<void> {
  await redisConnection.getClient().set(`cache:${key}`, JSON.stringify(value), "EX", ttlSec);
}

export async function cacheDel(key: string): Promise<void> {
  await redisConnection.getClient().del(`cache:${key}`);
}
