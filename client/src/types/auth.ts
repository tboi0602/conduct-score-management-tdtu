export type AppRole = "ADMIN" | "STUDENT" | "EVENT_ORGANIZER" | "STUDENT_AFFAIRS";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
};
