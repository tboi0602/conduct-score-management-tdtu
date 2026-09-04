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
  createdAt: string;
  updatedAt: string;
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
};

export type UserPayload = {
  email: string;
  name: string;
  password?: string;
  roleIds: string[];
  studentCode?: string | null;
  classId?: string | null;
};
