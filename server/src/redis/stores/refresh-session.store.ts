import { redisConnection } from "@redis/connection";

export type RefreshSession = { tokenHash: string; role: string; userId: string };
const keyOf = (sessionId: string) => `auth:session:${sessionId}`;
const userSessionsKeyOf = (userId: string) => `auth:user-sessions:${userId}`;

export async function setRefreshSession(
  sessionId: string,
  session: RefreshSession,
  ttlSec: number,
): Promise<void> {
  const client = redisConnection.getClient();
  await client
    .multi()
    .set(keyOf(sessionId), JSON.stringify(session), "EX", ttlSec)
    .sadd(userSessionsKeyOf(session.userId), sessionId)
    .expire(userSessionsKeyOf(session.userId), ttlSec)
    .exec();
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
  const client = redisConnection.getClient();
  const session = await getRefreshSession(sessionId);
  const transaction = client.multi().del(keyOf(sessionId));
  if (session) transaction.srem(userSessionsKeyOf(session.userId), sessionId);
  await transaction.exec();
}

async function legacySessionIdsForUser(userId: string): Promise<string[]> {
  const client = redisConnection.getClient();
  const ids: string[] = [];
  let cursor = "0";
  do {
    const [nextCursor, keys] = await client.scan(cursor, "MATCH", "auth:session:*", "COUNT", 100);
    cursor = nextCursor;
    if (keys.length === 0) continue;
    const values = await client.mget(...keys);
    values.forEach((raw, index) => {
      if (!raw) return;
      try {
        const value = JSON.parse(raw) as Partial<RefreshSession>;
        if (value.userId === userId) ids.push(keys[index].slice("auth:session:".length));
      } catch {
        // Ignore malformed legacy values; normal expiry will remove them.
      }
    });
  } while (cursor !== "0");
  return ids;
}

export async function revokeUserRefreshSessions(userId: string): Promise<void> {
  const client = redisConnection.getClient();
  const indexedIds = await client.smembers(userSessionsKeyOf(userId));
  const legacyIds = await legacySessionIdsForUser(userId);
  const sessionIds = [...new Set([...indexedIds, ...legacyIds])];
  const keys = sessionIds.map(keyOf);
  await client.del(...keys, userSessionsKeyOf(userId));
}
