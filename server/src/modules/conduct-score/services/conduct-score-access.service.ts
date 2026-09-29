import { Prisma } from "@prisma/client";
import { prisma } from "@config/prisma";
import { getEventAccess } from "@services/events/event-access.service";
import { ApiError } from "@utils/ApiError";
export async function facultyScope(userId: string): Promise<string | undefined> {
  const access = await getEventAccess(userId);
  if (!access.manageAnyUnit && !access.facultyId) {
    throw new ApiError(409, "A primary faculty must be assigned");
  }
  return access.manageAnyUnit ? undefined : (access.facultyId ?? undefined);
}

export function studentFacultyWhere(facultyId?: string): Prisma.StudentWhereInput {
  return facultyId ? { class: { is: { major: { is: { facultyId } } } } } : {};
}

export async function assertStudentScope(userId: string, studentId: string) {
  const facultyId = await facultyScope(userId);
  const student = await prisma.student.findFirst({
    where: { id: studentId, ...studentFacultyWhere(facultyId) },
    select: { id: true },
  });
  if (!student) throw new ApiError(404, "Student not found in your faculty scope");
  return { facultyId };
}
