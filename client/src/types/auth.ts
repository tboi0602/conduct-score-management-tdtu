export type AppRole = string;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  isStudent?: boolean;
  role: AppRole;
};
