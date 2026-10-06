import { authHttp } from "@/services/http";
import type { Faculty, PaginatedResponse } from "@/types/admin";
import type {
  Criteria,
  CriteriaFilters,
  CriteriaPayload,
  EventFilters,
  EventPayload,
  ManagedEvent,
  OrganizerFilters,
  OrganizerPayload,
  OrganizingUnit,
  Semester,
  SemesterFilters,
  SemesterPayload,
  PublicEvent,
  EventRegistration,
  MyEventRegistration,
  StudentOption,
  StudentEventFilters,
} from "@/types/events";

function queryString(
  page: number,
  limit: number,
  filters: Record<string, string | undefined> = {},
) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, value);
  }
  return query;
}

function write<T>(path: string, method: "POST" | "PUT", payload: unknown) {
  return authHttp<{ ok: true; data: T }>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export const eventService = {
  list: (page: number, limit: number, filters: EventFilters = {}) =>
    authHttp<PaginatedResponse<ManagedEvent>>(
      `/api/v1/events?${queryString(page, limit, filters)}`,
    ),
  create: (payload: EventPayload) => write<ManagedEvent>("/api/v1/events", "POST", payload),
  get: (id: string) => authHttp<{ ok: true; data: ManagedEvent }>(`/api/v1/events/${id}`),
  update: (id: string, payload: EventPayload) =>
    write<ManagedEvent>(`/api/v1/events/${id}`, "PUT", payload),
  delete: (id: string) => authHttp<void>(`/api/v1/events/${id}`, { method: "DELETE" }),
  semesters: (page: number, year?: string) =>
    authHttp<PaginatedResponse<Semester>>(
      `/api/v1/events/options/semesters?${queryString(page, 20, { year })}`,
    ),
  criteria: (page: number, search?: string, limit = 20) =>
    authHttp<PaginatedResponse<Criteria>>(
      `/api/v1/events/options/criteria?${queryString(page, limit, { search })}`,
    ),
  organizers: (page: number, search?: string, facultyId?: string, limit = 50) =>
    authHttp<PaginatedResponse<OrganizingUnit>>(
      `/api/v1/events/options/organizers?${queryString(page, limit, { search, facultyId, writable: "true" })}`,
    ),
};

export const eventRegistrationService = {
  discover: (page: number, limit: number, filters: StudentEventFilters = {}) =>
    authHttp<PaginatedResponse<PublicEvent>>(
      `/api/v1/events/discover?${queryString(page, limit, filters)}`,
    ),
  recommended: (page: number, limit: number, filters: StudentEventFilters = {}) =>
    authHttp<PaginatedResponse<PublicEvent>>(
      `/api/v1/events/recommended?${queryString(page, limit, filters)}`,
    ),
  detail: (id: string) =>
    authHttp<{ ok: true; data: PublicEvent }>(`/api/v1/events/discover/${id}`),
  mine: (page: number, limit: number, view?: string) =>
    authHttp<PaginatedResponse<MyEventRegistration>>(
      `/api/v1/events/my-registrations?${queryString(page, limit, { view })}`,
    ),
  register: (eventId: string) =>
    authHttp<{ ok: true; data: PublicEvent }>(`/api/v1/events/${eventId}/register`, {
      method: "POST",
    }),
  cancel: (eventId: string) =>
    authHttp<{ ok: true; data: PublicEvent }>(`/api/v1/events/${eventId}/register`, {
      method: "DELETE",
    }),
  managed: (eventId: string, page: number, limit: number, search?: string, status?: string) =>
    authHttp<PaginatedResponse<EventRegistration>>(
      `/api/v1/events/${eventId}/registrations?${queryString(page, limit, { search, status })}`,
    ),
  students: (eventId: string, page: number, search?: string) =>
    authHttp<PaginatedResponse<StudentOption>>(
      `/api/v1/events/${eventId}/registration-students/options?${queryString(page, 20, { search })}`,
    ),
  registerStudent: (eventId: string, studentId: string) =>
    write<unknown>(`/api/v1/events/${eventId}/registrations`, "POST", { studentId }),
  cancelStudent: (eventId: string, studentId: string) =>
    authHttp<{ ok: true; data: unknown }>(`/api/v1/events/${eventId}/registrations/${studentId}`, {
      method: "DELETE",
    }),
  organizerOptions: (type?: string, search?: string) =>
    authHttp<PaginatedResponse<OrganizingUnit>>(
      `/api/v1/events/discover-options/organizers?${queryString(1, 100, { type, search })}`,
    ),
  academicOptions: () =>
    authHttp<{ ok: true; data: Faculty[] }>("/api/v1/events/discover-options/academic"),
};

export const organizerService = {
  list: (page: number, limit: number, filters: OrganizerFilters = {}) =>
    authHttp<PaginatedResponse<OrganizingUnit>>(
      `/api/v1/organizers?${queryString(page, limit, filters)}`,
    ),
  create: (payload: OrganizerPayload) =>
    write<OrganizingUnit>("/api/v1/organizers", "POST", payload),
  update: (id: string, payload: OrganizerPayload) =>
    write<OrganizingUnit>(`/api/v1/organizers/${id}`, "PUT", payload),
  delete: (id: string) => authHttp<void>(`/api/v1/organizers/${id}`, { method: "DELETE" }),
};

export const criteriaService = {
  list: (page: number, limit: number, filters: CriteriaFilters = {}) =>
    authHttp<PaginatedResponse<Criteria>>(`/api/v1/criteria?${queryString(page, limit, filters)}`),
  create: (payload: CriteriaPayload) => write<Criteria>("/api/v1/criteria", "POST", payload),
  update: (id: string, payload: CriteriaPayload) =>
    write<Criteria>(`/api/v1/criteria/${id}`, "PUT", payload),
  delete: (id: string) => authHttp<void>(`/api/v1/criteria/${id}`, { method: "DELETE" }),
};

export const semesterService = {
  list: (page: number, limit: number, filters: SemesterFilters = {}) =>
    authHttp<PaginatedResponse<Semester>>(`/api/v1/semesters?${queryString(page, limit, filters)}`),
  create: (payload: SemesterPayload) => write<Semester>("/api/v1/semesters", "POST", payload),
  update: (id: string, payload: SemesterPayload) =>
    write<Semester>(`/api/v1/semesters/${id}`, "PUT", payload),
  delete: (id: string) => authHttp<void>(`/api/v1/semesters/${id}`, { method: "DELETE" }),
};
