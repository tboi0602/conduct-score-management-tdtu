import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeRaw: vi.fn(),
  findWarnings: vi.fn(),
  transaction: vi.fn(),
}));

const transactionClient = {
  $executeRaw: mocks.executeRaw,
  conductScoreWarning: { findMany: mocks.findWarnings },
};

vi.mock("@config/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { evaluateConductScoreWarnings } from "@modules/warnings/services/conduct-score-warning.service";

const sqlText = (value: unknown) =>
  ((value as { strings?: readonly string[] }).strings ?? []).join(" ");

describe("conduct score warning account status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeRaw.mockResolvedValue(0);
    mocks.findWarnings.mockResolvedValue([]);
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof transactionClient) => unknown) =>
        callback(transactionClient),
    );
  });

  it("creates, resolves and selects warnings only for active users", async () => {
    await evaluateConductScoreWarnings(new Date("2026-11-16T05:00:00.000Z"));

    expect(sqlText(mocks.executeRaw.mock.calls[0]?.[0])).toContain(
      'JOIN "users" u ON u."id" = s."userId" AND u."status" = \'ACTIVE\'',
    );
    expect(sqlText(mocks.executeRaw.mock.calls[2]?.[0])).toContain("u.\"status\" = 'ACTIVE'");
    expect(mocks.findWarnings).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          student: { user: { status: "ACTIVE" } },
        }),
      }),
    );
  });
});
