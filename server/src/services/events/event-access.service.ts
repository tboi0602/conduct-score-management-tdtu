import { prisma } from "@config/prisma";
import { ApiError } from "@utils/ApiError";

export type EventAccess = { userId: string; facultyId: string | null; manageAnyUnit: boolean };

export async function getEventAccess(userId: string): Promise<EventAccess> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      primaryFacultyId: true,
      student: { select: { class: { select: { major: { select: { facultyId: true } } } } } },
      userRoles: {
        select: {
          role: {
            select: {
              rolePermissions: { select: { permission: { select: { permission: true } } } },
            },
          },
        },
      },
    },
  });
  if (!user) throw new ApiError(401, "User not found");
  const granted = user.userRoles.flatMap(({ role }) =>
    role.rolePermissions.map(({ permission }) => permission.permission),
  );
  return {
    userId,
    facultyId: user.student?.class?.major.facultyId ?? user.primaryFacultyId,
    manageAnyUnit: granted.includes("*") || granted.includes("event.manage-any-unit"),
  };
}

export function eventScope(access: EventAccess) {
  if (access.manageAnyUnit) return {};
  if (!access.facultyId) return { organizerId: "00000000-0000-0000-0000-000000000000" };
  return { organizer: { is: { facultyId: access.facultyId } } };
}

export async function assertOrganizerAccess(organizerId: string, access: EventAccess) {
  const organizer = await prisma.organizingUnit.findUnique({ where: { id: organizerId } });
  if (!organizer) throw new ApiError(409, "Organizing unit does not exist");
  if (!access.manageAnyUnit && (!access.facultyId || organizer.facultyId !== access.facultyId)) {
    throw new ApiError(403, "Organizing unit is outside your faculty scope");
  }
  return organizer;
}
