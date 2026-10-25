import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  del: vi.fn(),
  exec: vi.fn(),
  expire: vi.fn(),
  get: vi.fn(),
  mget: vi.fn(),
  multi: vi.fn(),
  sadd: vi.fn(),
  scan: vi.fn(),
  set: vi.fn(),
  smembers: vi.fn(),
  srem: vi.fn(),
}));

const transaction = {
  del: mocks.del,
  exec: mocks.exec,
  expire: mocks.expire,
  sadd: mocks.sadd,
  set: mocks.set,
  srem: mocks.srem,
};

Object.values(transaction).forEach((method) => method.mockReturnValue(transaction));

vi.mock("@redis/connection", () => ({
  redisConnection: {
    getClient: () => ({
      del: mocks.del,
      get: mocks.get,
      mget: mocks.mget,
      multi: mocks.multi,
      scan: mocks.scan,
      smembers: mocks.smembers,
    }),
  },
}));

import {
  revokeUserRefreshSessions,
  setRefreshSession,
} from "../../src/redis/stores/refresh-session.store";

describe("refresh session user index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(transaction).forEach((method) => method.mockReturnValue(transaction));
    mocks.multi.mockReturnValue(transaction);
    mocks.exec.mockResolvedValue([]);
    mocks.del.mockResolvedValue(0);
  });

  it("indexes a newly issued session by user with the same TTL", async () => {
    await setRefreshSession(
      "session-1",
      { tokenHash: "hash", role: "STUDENT", userId: "user-1" },
      3600,
    );

    expect(mocks.set).toHaveBeenCalledWith(
      "auth:session:session-1",
      JSON.stringify({ tokenHash: "hash", role: "STUDENT", userId: "user-1" }),
      "EX",
      3600,
    );
    expect(mocks.sadd).toHaveBeenCalledWith("auth:user-sessions:user-1", "session-1");
    expect(mocks.expire).toHaveBeenCalledWith("auth:user-sessions:user-1", 3600);
  });

  it("revokes indexed and legacy sessions belonging to the user", async () => {
    mocks.smembers.mockResolvedValue(["session-indexed"]);
    mocks.scan.mockResolvedValue([
      "0",
      ["auth:session:session-legacy", "auth:session:session-other"],
    ]);
    mocks.mget.mockResolvedValue([
      JSON.stringify({ tokenHash: "a", role: "STUDENT", userId: "user-1" }),
      JSON.stringify({ tokenHash: "b", role: "STUDENT", userId: "user-2" }),
    ]);

    await revokeUserRefreshSessions("user-1");

    expect(mocks.del).toHaveBeenCalledWith(
      "auth:session:session-indexed",
      "auth:session:session-legacy",
      "auth:user-sessions:user-1",
    );
  });
});
