import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findStaff: vi.fn(),
  updateUser: vi.fn(),
  updateWarnings: vi.fn(),
  transaction: vi.fn(),
  revokeUserRefreshSessions: vi.fn(),
}));

const transactionClient = {
  user: { update: mocks.updateUser },
  conductScoreWarning: { updateMany: mocks.updateWarnings },
};

vi.mock("@config/prisma", () => ({
  prisma: {
    user: { findFirst: mocks.findStaff },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@redis", () => ({
  redisClient: { revokeUserRefreshSessions: mocks.revokeUserRefreshSessions },
}));

vi.mock("@services/users/student-account-deletion.service", () => ({
  deleteStudentAccount: vi.fn(),
}));

import { setStaffStatus } from "../../src/services/users/user.service";

describe("staff status conduct-score warnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findStaff.mockResolvedValue({ id: "staff-1" });
    mocks.updateUser.mockResolvedValue({ id: "staff-1", status: "DISABLED" });
    mocks.updateWarnings.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof transactionClient) => unknown) =>
        callback(transactionClient),
    );
    mocks.revokeUserRefreshSessions.mockResolvedValue(undefined);
  });

  it("resolves active warnings when an account is disabled", async () => {
    await setStaffStatus("admin-1", "staff-1", "DISABLED");

    expect(mocks.updateWarnings).toHaveBeenCalledWith({
      where: { student: { userId: "staff-1" }, status: "ACTIVE" },
      data: { status: "RESOLVED", resolvedAt: expect.any(Date) },
    });
    expect(mocks.revokeUserRefreshSessions).toHaveBeenCalledWith("staff-1");
  });

  it("does not reopen warnings when an account is activated", async () => {
    mocks.updateUser.mockResolvedValue({ id: "staff-1", status: "ACTIVE" });

    await setStaffStatus("admin-1", "staff-1", "ACTIVE");

    expect(mocks.updateWarnings).not.toHaveBeenCalled();
  });
});
