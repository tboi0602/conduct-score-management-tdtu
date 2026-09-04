import { redisConnection } from "@redis/connection";

export type RefreshSession = { tokenHash: string; role: string };
const keyOf = (userId: string) => `auth:refresh:${userId}`;

export async function setRefreshSession(
  userId: string,
  session: RefreshSession,
  ttlSec: number,
): Promise<void> {
  await redisConnection.getClient().set(keyOf(userId), JSON.stringify(session), "EX", ttlSec);
}

export async function getRefreshSession(userId: string): Promise<RefreshSession | null> {
  const raw = await redisConnection.getClient().get(keyOf(userId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<RefreshSession>;
    return typeof value.tokenHash === "string" && typeof value.role === "string"
      ? { tokenHash: value.tokenHash, role: value.role }
      : null;
  } catch {
    return null;
  }
}

export async function revokeRefreshSession(userId: string): Promise<void> {
  await redisConnection.getClient().del(keyOf(userId));
}
