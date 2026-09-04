import { PrismaClient } from "@prisma/client";

// Prisma in log warn/error ra stdout là đủ dùng.
export const prisma = new PrismaClient({
  log: ["warn", "error"],
});
