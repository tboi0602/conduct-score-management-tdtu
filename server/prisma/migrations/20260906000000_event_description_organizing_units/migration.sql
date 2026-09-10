-- Rich event descriptions and concrete organizing units.
CREATE TYPE "OrganizingUnitType" AS ENUM ('UNIVERSITY', 'FACULTY', 'CLASS', 'CLUB');

CREATE TABLE "organizing_units" (
  "id" UUID NOT NULL,
  "type" "OrganizingUnitType" NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(150),
  "facultyId" UUID,
  "classId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organizing_units_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "users" ADD COLUMN "primaryFacultyId" UUID;
ALTER TABLE "events" ADD COLUMN "description" TEXT NOT NULL DEFAULT '', ADD COLUMN "organizerId" UUID;

CREATE UNIQUE INDEX "organizing_units_code_key" ON "organizing_units"("code");
CREATE UNIQUE INDEX "organizing_units_classId_key" ON "organizing_units"("classId");
CREATE UNIQUE INDEX "organizing_units_university_type_key" ON "organizing_units"("type") WHERE "type" = 'UNIVERSITY';
CREATE UNIQUE INDEX "organizing_units_faculty_unit_key" ON "organizing_units"("facultyId") WHERE "type" = 'FACULTY';
CREATE INDEX "organizing_units_type_createdAt_id_idx" ON "organizing_units"("type", "createdAt", "id");
CREATE INDEX "organizing_units_facultyId_type_createdAt_id_idx" ON "organizing_units"("facultyId", "type", "createdAt", "id");
CREATE INDEX "organizing_units_name_trgm_idx" ON "organizing_units" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "users_primaryFacultyId_idx" ON "users"("primaryFacultyId");
CREATE INDEX "events_organizerId_createdAt_id_idx" ON "events"("organizerId", "createdAt", "id");
CREATE INDEX "faculties_code_id_idx" ON "faculties"("code", "id");
CREATE INDEX "majors_facultyId_code_id_idx" ON "majors"("facultyId", "code", "id");
CREATE INDEX "classes_majorId_code_id_idx" ON "classes"("majorId", "code", "id");
CREATE INDEX "faculties_name_trgm_idx" ON "faculties" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "majors_name_trgm_idx" ON "majors" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "classes_name_trgm_idx" ON "classes" USING GIN ("name" gin_trgm_ops);

ALTER TABLE "organizing_units" ADD CONSTRAINT "organizing_units_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organizing_units" ADD CONSTRAINT "organizing_units_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_primaryFacultyId_fkey" FOREIGN KEY ("primaryFacultyId") REFERENCES "faculties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizing_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "organizing_units" ("id", "type", "code", "name", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'UNIVERSITY', 'TDTU', 'Đại học Tôn Đức Thắng', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "organizing_units" ("id", "type", "code", "facultyId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'FACULTY', 'FACULTY:' || f."code", f."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "faculties" f;

INSERT INTO "organizing_units" ("id", "type", "code", "facultyId", "classId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'CLASS', 'CLASS:' || c."code", m."facultyId", c."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "classes" c JOIN "majors" m ON m."id" = c."majorId";

UPDATE "events" e SET "organizerId" = u."id"
FROM "organizing_units" u WHERE e."type" = 'UNIVERSITY' AND u."type" = 'UNIVERSITY';
