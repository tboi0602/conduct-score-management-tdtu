export type AppRole = "ADMIN" | "STUDENT" | "LECTURER";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
};
