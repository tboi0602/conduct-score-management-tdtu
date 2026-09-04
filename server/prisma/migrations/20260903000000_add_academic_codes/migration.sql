ALTER TABLE "faculties" ADD COLUMN "code" VARCHAR(20);
UPDATE "faculties" SET "code" = 'LEGACY-F-' || SUBSTRING("id"::text, 1, 8) WHERE "code" IS NULL;
ALTER TABLE "faculties" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "faculties_code_key" ON "faculties"("code");

ALTER TABLE "majors" ADD COLUMN "code" VARCHAR(20);
UPDATE "majors" SET "code" = 'LEGACY-M-' || SUBSTRING("id"::text, 1, 8) WHERE "code" IS NULL;
ALTER TABLE "majors" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "majors_code_key" ON "majors"("code");

ALTER TABLE "classes" ADD COLUMN "code" VARCHAR(50);
UPDATE "classes" SET "code" = 'LEGACY-C-' || SUBSTRING("id"::text, 1, 8) WHERE "code" IS NULL;
ALTER TABLE "classes" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "classes_code_key" ON "classes"("code");
