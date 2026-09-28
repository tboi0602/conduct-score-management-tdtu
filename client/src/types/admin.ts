import type { AppRole } from "@/types/auth";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedResponse<T> = {
  ok: true;
  data: T[];
  pagination: PaginationMeta;
};

export type Permission = {
  id: string;
  permission: string;
  description: string | null;
};

export type AcademicClass = { id: string; code: string; name: string };
export type Major = { id: string; code: string; name: string; classes: AcademicClass[] };
export type Faculty = { id: string; code: string; name: string; majors: Major[] };
export type AcademicKind = "faculties" | "majors" | "classes";
export type AcademicRecord = {
  id: string;
  code: string;
  name: string;
  facultyId?: string;
  majorId?: string;
  faculty?: Pick<Faculty, "id" | "code" | "name">;
  major?: Omit<Major, "classes"> & { faculty: Pick<Faculty, "id" | "code" | "name"> };
  _count?: { majors?: number; classes?: number; students?: number; primaryUsers?: number };
};
export type AcademicPayload = { code: string; name: string; facultyId?: string; majorId?: string };
export type UserFilters = {
  search?: string;
  facultyId?: string;
  majorId?: string;
  classId?: string;
  roleId?: string;
};

export type Role = {
  id: string;
  name: AppRole | string;
  rolePermissions: Array<{ permission: Permission }>;
  _count: { userRoles: number };
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
  primaryFacultyId: string | null;
  primaryFaculty: Pick<Faculty, "id" | "code" | "name"> | null;
  userRoles: Array<{ role: { id: string; name: string } }>;
  student: {
    id: string;
    studentCode: string;
    classId: string | null;
    class:
      | (AcademicClass & { major: Omit<Major, "classes"> & { faculty: Omit<Faculty, "majors"> } })
      | null;
  } | null;
};

export type CurrentUserProfile = {
  id: string;
  email: string;
  name: string;
  roles: Array<{ id: string; name: string }>;
  permissions: Permission[];
  effectiveFaculty: Pick<Faculty, "id" | "code" | "name"> | null;
  student: {
    id: string;
    userId: string;
    classId: string | null;
    studentCode: string;
    phone: string | null;
    address: string | null;
    dateOfBirth: string | null;
    class:
      | (AcademicClass & {
          major: Omit<Major, "classes"> & { faculty: Omit<Faculty, "majors"> };
        })
      | null;
  } | null;
};

export type StudentProfilePayload = {
  name: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
};

export type UserPayload = {
  email: string;
  name: string;
  password?: string;
  roleIds: string[];
  studentCode?: string | null;
  classId?: string | null;
  primaryFacultyId?: string | null;
};
