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
  getCurrentUser: () => authHttp<{ ok: true; data: CurrentUserProfile }>("/api/v1/auth/me"),
};
