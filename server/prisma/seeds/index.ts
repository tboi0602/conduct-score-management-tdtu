import { PrismaClient } from "@prisma/client";

import { seedAcademicData } from "./academic.seed";
import { seedAuthData } from "./auth.seed";
import { seedOrganizingUnits } from "./organizer.seed";
import { seedTrainingCriteria } from "./criteria.seed";
import { seedSemesters } from "./semester.seed";
import { seedClassSessions } from "./schedule.seed";
import { seedEvents } from "./event.seed";
import { seedDemoData } from "./demo.seed";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("[seed] Seeding academic data...");
  await seedAcademicData(prisma);
  console.log("[seed] Seeding organizing units...");
  await seedOrganizingUnits(prisma);
  console.log("[seed] Seeding training criteria...");
  await seedTrainingCriteria(prisma);
  console.log("[seed] Seeding semesters...");
  await seedSemesters(prisma);
  console.log("[seed] Seeding class sessions...");
  await seedClassSessions(prisma);
  console.log("[seed] Seeding sample events...");
  await seedEvents(prisma);
  console.log("[seed] Seeding roles, permissions and admin account...");
  await seedAuthData(prisma);
  console.log("[seed] Seeding demo students, registrations, attendance and scores...");
  await seedDemoData(prisma);
  console.log("[seed] All seed data completed successfully");
}

main()
  .catch((error: unknown) => {
    console.error("[seed] Failed", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
