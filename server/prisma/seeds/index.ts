import { PrismaClient } from "@prisma/client";

import { seedAcademicData } from "./academic.seed";
import { seedAuthData } from "./auth.seed";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("[seed] Seeding academic data...");
  await seedAcademicData(prisma);
  console.log("[seed] Seeding roles, permissions and admin account...");
  await seedAuthData(prisma);
  console.log("[seed] All seed data completed successfully");
}

main()
  .catch((error: unknown) => {
    console.error("[seed] Failed", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
