import type { UserFilters } from "@/types/admin";

export const queryKeys = {
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
  },
  auth: {
    me: ["auth", "me"] as const,
  },
};
