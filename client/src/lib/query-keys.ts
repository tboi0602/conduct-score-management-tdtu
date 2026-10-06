import type { StudentReportFilter, UserFilters } from "@/types/admin";
import type { ConductScoreFilters } from "@/types/conduct-score";
import type {
  CriteriaFilters,
  EventFilters,
  OrganizerFilters,
  SemesterFilters,
  StudentEventFilters,
} from "@/types/events";

export const queryKeys = {
  events: {
    all: ["admin", "events"] as const,
    list: (filters: EventFilters) => ["admin", "events", "list", filters] as const,
    detail: (id: string) => ["admin", "events", "detail", id] as const,
    registrations: (id: string, search: string, status: string) =>
      ["admin", "events", id, "registrations", search, status] as const,
    studentOptions: (id: string, search: string) =>
      ["admin", "events", id, "student-options", search] as const,
  },
  studentEvents: {
    all: ["student", "events"] as const,
    listAll: ["student", "events", "list"] as const,
    mineAll: ["student", "events", "mine"] as const,
    list: (filters: StudentEventFilters) => ["student", "events", "list", filters] as const,
    recommended: (filters: StudentEventFilters) =>
      ["student", "events", "recommended", filters] as const,
    detail: (id: string) => ["student", "events", "detail", id] as const,
    mine: (view: string) => ["student", "events", "mine", view] as const,
    organizerOptions: (type?: string, search?: string) =>
      ["student", "events", "organizer-options", type, search] as const,
    academicOptions: ["student", "events", "academic-options"] as const,
  },
  criteria: {
    all: ["admin", "criteria"] as const,
    list: (filters: CriteriaFilters) => ["admin", "criteria", "list", filters] as const,
  },
  semesters: {
    all: ["admin", "semesters"] as const,
    list: (filters: SemesterFilters) => ["admin", "semesters", "list", filters] as const,
  },
  eventOptions: {
    criteria: ["admin", "event-options", "criteria"] as const,
    semesters: ["admin", "event-options", "semesters"] as const,
    criteriaPage: (page: number, search?: string) =>
      ["admin", "event-options", "criteria", page, search] as const,
    semesterPage: (page: number, year?: string) =>
      [...queryKeys.eventOptions.semesters, page, year] as const,
    organizerPage: (page: number, search?: string, facultyId?: string) =>
      ["admin", "event-options", "organizers", page, search, facultyId] as const,
  },
  organizers: {
    all: ["admin", "organizers"] as const,
    list: (filters: OrganizerFilters) => ["admin", "organizers", "list", filters] as const,
  },
  users: {
    all: ["admin", "users"] as const,
    list: (filters: UserFilters) => ["admin", "users", filters] as const,
  },
  roles: {
    all: ["admin", "roles"] as const,
  },
  permissions: {
    all: ["admin", "permissions"] as const,
  },
  academic: {
    options: ["admin", "academic", "options"] as const,
    all: ["admin", "academic"] as const,
    list: (kind: string, search?: string, facultyId?: string, majorId?: string) =>
      ["admin", "academic", kind, search, facultyId, majorId] as const,
  },
  auth: {
    me: ["auth", "me"] as const,
  },
  attendance: {
    events: ["admin", "attendance", "events"] as const,
    session: (eventId: string) => ["admin", "attendance", eventId, "session"] as const,
    qr: (eventId: string) => ["admin", "attendance", eventId, "qr"] as const,
    requests: (eventId: string, search: string, status: string) =>
      ["admin", "attendance", eventId, "requests", search, status] as const,
    request: (requestId: string) => ["student", "attendance", "request", requestId] as const,
    reconciliation: (eventId: string, search: string, state: string, page: number) =>
      ["admin", "attendance", eventId, "reconciliation", search, state, page] as const,
  },
  conductScores: {
    all: ["conduct-scores"] as const,
    list: (filters: ConductScoreFilters & { page: number }) =>
      ["conduct-scores", "list", filters] as const,
    detail: (studentId: string, semesterId: string) =>
      ["conduct-scores", "detail", studentId, semesterId] as const,
    mine: (semesterId: string) => ["conduct-scores", "mine", semesterId] as const,
  },
  dashboard: (semesterId?: string) => ["admin", "dashboard", semesterId] as const,
  reports: {
    students: (filters: StudentReportFilter, page: number) =>
      ["reports", "students", filters, page] as const,
  },
  schedules: {
    all: ["student", "schedules"] as const,
    mine: (semesterId: string) => ["student", "schedules", semesterId] as const,
    week: (semesterId: string, weekStart: string) =>
      ["student", "schedules", semesterId, "week", weekStart] as const,
  },
  appeals: {
    all: ["appeals"] as const,
    mine: ["appeals", "mine"] as const,
    eligible: ["appeals", "eligible"] as const,
    managed: (status: string, search: string) => ["appeals", "managed", status, search] as const,
    pending: ["appeals", "managed", "PENDING"] as const,
  },
  notifications: {
    all: ["student", "notifications"] as const,
    mine: (page: number) => ["student", "notifications", page] as const,
  },
  warnings: { mine: ["student", "warnings", "mine"] as const },
};
