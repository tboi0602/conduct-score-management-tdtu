import { redisConnection } from "@redis/connection";

export async function withLock<T>(
  key: string,
  ttlMs: number,
  task: () => Promise<T>,
): Promise<T | null> {
  const redis = redisConnection.getClient();
  const lockKey = `lock:${key}`;
  const token = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const acquired = await redis.set(lockKey, token, "PX", ttlMs, "NX");
  if (acquired !== "OK") return null;

  try {
    return await task();
  } finally {
    const releaseScript =
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
    await redis.eval(releaseScript, 1, lockKey, token);
  }
}
