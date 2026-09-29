import { redisConnection } from "@redis/connection";

export type RefreshSession = { tokenHash: string; role: string; userId: string };
const keyOf = (sessionId: string) => `auth:session:${sessionId}`;

export async function setRefreshSession(
  sessionId: string,
  session: RefreshSession,
  ttlSec: number,
): Promise<void> {
  await redisConnection.getClient().set(keyOf(sessionId), JSON.stringify(session), "EX", ttlSec);
}

export async function getRefreshSession(sessionId: string): Promise<RefreshSession | null> {
  const raw = await redisConnection.getClient().get(keyOf(sessionId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<RefreshSession>;
    return typeof value.tokenHash === "string" &&
      typeof value.role === "string" &&
      typeof value.userId === "string"
      ? { tokenHash: value.tokenHash, role: value.role, userId: value.userId }
      : null;
  } catch {
    return null;
  }
}

export async function revokeRefreshSession(sessionId: string): Promise<void> {
  await redisConnection.getClient().del(keyOf(sessionId));
}
