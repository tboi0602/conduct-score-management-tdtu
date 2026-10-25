import { Prisma } from "@prisma/client";

import { prisma } from "@config/prisma";
import { invalidateDashboardCache } from "@modules/dashboard";
import { redisClient } from "@redis";
import { ApiError } from "@utils/ApiError";

const STAFF_ROLE_NAMES = ["ADMIN", "EVENT_ORGANIZER", "STUDENT_AFFAIRS"] as const;

type LockedUser = { id: string; email: string };
type LockedStudent = { id: string; facultyId: string | null };
type ActiveRegistration = { eventId: string; facultyId: string | null };

export type DeleteStudentAccountOptions = {
  actorUserId: string;
  targetUserId: string;
  facultyScopeId?: string;
};

export async function deleteStudentAccount({
  actorUserId,
  targetUserId,
  facultyScopeId,
}: DeleteStudentAccountOptions): Promise<void> {
  if (actorUserId === targetUserId) {
    throw new ApiError(409, "You cannot delete your own account", "CANNOT_DELETE_SELF");
  }

  const affectedFacultyIds = await prisma.$transaction(
    async (tx) => {
      const users = await tx.$queryRaw<LockedUser[]>(Prisma.sql`
        SELECT "id", "email"
        FROM "users"
        WHERE "id" = ${targetUserId}::uuid
        FOR UPDATE
      `);
      const user = users[0];
      if (!user) throw new ApiError(404, "Student account not found", "STUDENT_NOT_FOUND");
      if (user.email === "admin") {
        throw new ApiError(400, "The default admin account cannot be deleted");
      }

      const students = await tx.$queryRaw<LockedStudent[]>(Prisma.sql`
        SELECT s."id", m."facultyId"
        FROM "students" s
        LEFT JOIN "classes" c ON c."id" = s."classId"
        LEFT JOIN "majors" m ON m."id" = c."majorId"
        WHERE s."userId" = ${targetUserId}::uuid
        FOR UPDATE OF s
      `);
      const student = students[0];
      if (!student) throw new ApiError(404, "Student account not found", "STUDENT_NOT_FOUND");
      if (facultyScopeId && student.facultyId !== facultyScopeId) {
        throw new ApiError(
          404,
          "Student not found in your faculty scope",
          "STUDENT_NOT_IN_FACULTY_SCOPE",
        );
      }

      const staffRole = await tx.userRole.findFirst({
        where: {
          userId: targetUserId,
          role: { name: { in: [...STAFF_ROLE_NAMES] } },
        },
        select: { role: { select: { name: true } } },
      });
      if (staffRole) {
        throw new ApiError(
          409,
          "Remove the staff role before deleting this student account",
          "STUDENT_HAS_STAFF_ROLE",
        );
      }

      const registrations = await tx.$queryRaw<ActiveRegistration[]>(Prisma.sql`
        SELECT er."eventId", ou."facultyId"
        FROM "event_registrations" er
        JOIN "events" e ON e."id" = er."eventId"
        LEFT JOIN "organizing_units" ou ON ou."id" = e."organizerId"
        WHERE er."studentId" = ${student.id}::uuid
          AND er."status" = 'REGISTERED'::"EventRegistrationStatus"
        FOR UPDATE OF er, e
      `);

      await tx.user.delete({ where: { id: targetUserId } });
      for (const registration of registrations) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "events"
          SET "registeredCount" = GREATEST("registeredCount" - 1, 0)
          WHERE "id" = ${registration.eventId}::uuid
        `);
      }

      return [
        ...new Set([student.facultyId, ...registrations.map(({ facultyId }) => facultyId)]),
      ].filter((facultyId): facultyId is string => Boolean(facultyId));
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  await Promise.all([
    redisClient.revokeUserRefreshSessions(targetUserId),
    invalidateDashboardCache(),
    ...affectedFacultyIds.map((facultyId) => invalidateDashboardCache(facultyId)),
  ]);
}
