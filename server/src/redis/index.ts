import { redisConnection } from "@redis/connection";
import * as cacheStore from "@redis/stores/cache.store";
import * as idempotencyStore from "@redis/stores/idempotency.store";
import * as lockStore from "@redis/stores/lock.store";
import * as rateLimitStore from "@redis/stores/rate-limit.store";
import * as refreshSessionStore from "@redis/stores/refresh-session.store";

// Facade dùng chung: bên ngoài chỉ import `redisClient` từ `@redis`.
export const redisClient = {
  connect: () => redisConnection.connect(),
  getClient: () => redisConnection.getClient(),
  close: () => redisConnection.close(),
  ...cacheStore,
  ...idempotencyStore,
  ...lockStore,
  ...rateLimitStore,
  ...refreshSessionStore,
};

export { REDIS_CONFIG } from "@redis/config";
