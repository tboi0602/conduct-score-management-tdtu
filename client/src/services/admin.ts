import { authHttp } from "@/services/http";
import type {
  AdminUser,
  CurrentUserProfile,
  Faculty,
  PaginatedResponse,
  Permission,
  Role,
  UserFilters,
  UserPayload,
  AcademicKind,
  AcademicPayload,
  AcademicRecord,
  StudentProfilePayload,
} from "@/types/admin";

const jsonHeaders = { "Content-Type": "application/json" };

export const adminService = {
  listUsers: (page: number, limit = 20, filters: UserFilters = {}) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    return authHttp<PaginatedResponse<AdminUser>>(`/api/v1/users?${query}`);
  },
  createUser: (payload: UserPayload) =>
    authHttp<{ data: AdminUser }>("/api/v1/users", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  updateUser: (id: string, payload: UserPayload) =>
    authHttp<{ data: AdminUser }>(`/api/v1/users/${id}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  deleteUser: (id: string) => authHttp<void>(`/api/v1/users/${id}`, { method: "DELETE" }),
  listFacultyUsers: (page: number, limit = 20, filters: UserFilters = {}) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.search) query.set("search", filters.search);
    return authHttp<PaginatedResponse<AdminUser>>(`/api/v1/faculty-users?${query}`);
  },
  createFacultyUser: (payload: UserPayload) =>
    authHttp<{ data: AdminUser }>("/api/v1/faculty-users", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ ...payload, roleName: payload.roleIds[0] }),
    }),
  updateFacultyUser: (id: string, payload: UserPayload) =>
    authHttp<{ data: AdminUser }>(`/api/v1/faculty-users/${id}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({ ...payload, roleName: payload.roleIds[0] }),
    }),
  deleteFacultyUser: (user: AdminUser) =>
    user.student
      ? authHttp<void>(`/api/v1/faculty-users/${user.id}`, { method: "DELETE" })
      : authHttp<{ ok: true; data: AdminUser }>(`/api/v1/faculty-users/${user.id}/status`, {
          method: "PATCH",
          headers: jsonHeaders,
          body: JSON.stringify({ status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }),
        }),

  listPermissions: (page: number, limit = 20) =>
    authHttp<PaginatedResponse<Permission>>(`/api/v1/rbac/permissions?page=${page}&limit=${limit}`),
  createPermission: (payload: { permission: string; description?: string | null }) =>
    authHttp<{ data: Permission }>("/api/v1/rbac/permissions", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  updatePermission: (id: string, payload: { permission: string; description?: string | null }) =>
    authHttp<{ data: Permission }>(`/api/v1/rbac/permissions/${id}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  deletePermission: (id: string) =>
    authHttp<void>(`/api/v1/rbac/permissions/${id}`, { method: "DELETE" }),

  listRoles: (page: number, limit = 20) =>
    authHttp<PaginatedResponse<Role>>(`/api/v1/rbac/roles?page=${page}&limit=${limit}`),
  createRole: (payload: { name: string; permissionIds: string[] }) =>
    authHttp<{ data: Role }>("/api/v1/rbac/roles", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  updateRole: (id: string, payload: { name: string; permissionIds: string[] }) =>
    authHttp<{ data: Role }>(`/api/v1/rbac/roles/${id}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  deleteRole: (id: string) => authHttp<void>(`/api/v1/rbac/roles/${id}`, { method: "DELETE" }),
  getAcademicOptions: () => authHttp<{ ok: true; data: Faculty[] }>("/api/v1/academic/options"),
  listAcademic: (
    kind: AcademicKind,
    page: number,
    limit: number,
    filters: { search?: string; facultyId?: string; majorId?: string },
  ) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const resource = kind === "classes" ? "faculty-classes" : kind;
    return authHttp<PaginatedResponse<AcademicRecord>>(`/api/v1/academic/${resource}?${query}`);
  },
  createAcademic: (kind: AcademicKind, payload: AcademicPayload) =>
    authHttp<{ ok: true; data: AcademicRecord }>(
      `/api/v1/academic/${kind === "classes" ? "faculty-classes" : kind}`,
      {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
    ),
  updateAcademic: (kind: AcademicKind, id: string, payload: AcademicPayload) =>
    authHttp<{ ok: true; data: AcademicRecord }>(
      `/api/v1/academic/${kind === "classes" ? "faculty-classes" : kind}/${id}`,
      {
        method: "PUT",
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
    ),
  deleteAcademic: (kind: AcademicKind, id: string) =>
    authHttp<void>(`/api/v1/academic/${kind}/${id}`, { method: "DELETE" }),
  getCurrentUser: () => authHttp<{ ok: true; data: CurrentUserProfile }>("/api/v1/auth/me"),
  updateCurrentStudent: (payload: StudentProfilePayload) =>
    authHttp<{ ok: true; data: CurrentUserProfile }>("/api/v1/auth/me", {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
};
