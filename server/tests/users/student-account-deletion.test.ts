import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
  findStaffRole: vi.fn(),
  deleteUser: vi.fn(),
  transaction: vi.fn(),
  revokeUserRefreshSessions: vi.fn(),
  invalidateDashboardCache: vi.fn(),
}));

vi.mock("@config/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("@redis", () => ({
  redisClient: {
    revokeUserRefreshSessions: mocks.revokeUserRefreshSessions,
  },
}));

vi.mock("@modules/dashboard", () => ({
  invalidateDashboardCache: mocks.invalidateDashboardCache,
}));

import { deleteStudentAccount } from "../../src/services/users/student-account-deletion.service";

const tx = {
  $queryRaw: mocks.queryRaw,
  $executeRaw: mocks.executeRaw,
  userRole: { findFirst: mocks.findStaffRole },
  user: { delete: mocks.deleteUser },
};

describe("student account deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    mocks.findStaffRole.mockResolvedValue(null);
    mocks.deleteUser.mockResolvedValue({ id: "user-1" });
    mocks.executeRaw.mockResolvedValue(1);
    mocks.revokeUserRefreshSessions.mockResolvedValue(undefined);
    mocks.invalidateDashboardCache.mockResolvedValue(undefined);
  });

  it("decrements every active registration and performs post-commit cleanup", async () => {
    mocks.queryRaw
      .mockResolvedValueOnce([{ id: "user-1", email: "student@student.tdtu.edu.vn" }])
      .mockResolvedValueOnce([{ id: "student-1", facultyId: "faculty-student" }])
      .mockResolvedValueOnce([
        { eventId: "event-1", facultyId: "faculty-event" },
        { eventId: "event-2", facultyId: "faculty-event" },
      ]);

    await deleteStudentAccount({ actorUserId: "actor-1", targetUserId: "user-1" });

    expect(mocks.deleteUser).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(mocks.executeRaw).toHaveBeenCalledTimes(2);
    expect(mocks.revokeUserRefreshSessions).toHaveBeenCalledWith("user-1");
    expect(mocks.invalidateDashboardCache).toHaveBeenCalledWith();
    expect(mocks.invalidateDashboardCache).toHaveBeenCalledWith("faculty-student");
    expect(mocks.invalidateDashboardCache).toHaveBeenCalledWith("faculty-event");
  });

  it("rejects a student account that still has a staff role", async () => {
    mocks.queryRaw
      .mockResolvedValueOnce([{ id: "user-1", email: "student@student.tdtu.edu.vn" }])
      .mockResolvedValueOnce([{ id: "student-1", facultyId: "faculty-1" }]);
    mocks.findStaffRole.mockResolvedValue({ role: { name: "EVENT_ORGANIZER" } });

    const action = deleteStudentAccount({ actorUserId: "actor-1", targetUserId: "user-1" });

    await expect(action).rejects.toMatchObject({
      status: 409,
      code: "STUDENT_HAS_STAFF_ROLE",
    });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(mocks.executeRaw).not.toHaveBeenCalled();
    expect(mocks.revokeUserRefreshSessions).not.toHaveBeenCalled();
  });

  it("enforces the faculty scope before deleting data", async () => {
    mocks.queryRaw
      .mockResolvedValueOnce([{ id: "user-1", email: "student@student.tdtu.edu.vn" }])
      .mockResolvedValueOnce([{ id: "student-1", facultyId: "faculty-2" }]);

    const action = deleteStudentAccount({
      actorUserId: "actor-1",
      targetUserId: "user-1",
      facultyScopeId: "faculty-1",
    });

    await expect(action).rejects.toMatchObject({
      status: 404,
      code: "STUDENT_NOT_IN_FACULTY_SCOPE",
    });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
