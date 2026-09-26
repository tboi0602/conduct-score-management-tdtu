CREATE TYPE "EventDeliveryMode" AS ENUM ('OFFLINE', 'ONLINE');
CREATE TYPE "ScheduleExceptionStatus" AS ENUM ('HAS_CLASS', 'NO_CLASS');

ALTER TABLE "semesters" ADD COLUMN "startDate" DATE;
ALTER TABLE "semesters" ADD COLUMN "endDate" DATE;

UPDATE "semesters"
SET
  "startDate" = CASE
    WHEN "type" = 'HK1' THEN make_date("year", 9, 1)
    WHEN "type" = 'HK2' THEN make_date("year", 2, 1)
    ELSE make_date("year", 7, 1)
  END,
  "endDate" = CASE
    WHEN "type" = 'HK1' THEN make_date("year" + 1, 1, 31)
    WHEN "type" = 'HK2' THEN make_date("year", 6, 30)
    ELSE make_date("year", 8, 31)
  END;

ALTER TABLE "semesters" ALTER COLUMN "startDate" SET NOT NULL;
ALTER TABLE "semesters" ALTER COLUMN "endDate" SET NOT NULL;

ALTER TABLE "events" ADD COLUMN "deliveryMode" "EventDeliveryMode";
UPDATE "events"
SET "deliveryMode" = CASE
  WHEN ("timeStart" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date =
       ("timeEnd" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
    THEN 'OFFLINE'::"EventDeliveryMode"
  ELSE 'ONLINE'::"EventDeliveryMode"
END;
ALTER TABLE "events" ALTER COLUMN "deliveryMode" SET DEFAULT 'OFFLINE';
ALTER TABLE "events" ALTER COLUMN "deliveryMode" SET NOT NULL;

ALTER TABLE "schedules" ADD COLUMN "semesterId" UUID;
UPDATE "schedules"
SET "semesterId" = (SELECT "id" FROM "semesters" ORDER BY "year" DESC, "type" ASC LIMIT 1)
WHERE "semesterId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "schedules" WHERE "semesterId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate schedules without an existing semester';
  END IF;
END $$;

ALTER TABLE "schedules" ALTER COLUMN "semesterId" SET NOT NULL;
DROP INDEX IF EXISTS "schedules_studentId_idx";
CREATE UNIQUE INDEX "class_sessions_name_key" ON "class_sessions"("name");
CREATE UNIQUE INDEX "schedules_studentId_semesterId_dayOfWeek_classSessionId_key"
  ON "schedules"("studentId", "semesterId", "dayOfWeek", "classSessionId");
CREATE INDEX "schedules_studentId_semesterId_idx" ON "schedules"("studentId", "semesterId");
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_semesterId_fkey"
  FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "schedule_exceptions" (
  "id" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "semesterId" UUID NOT NULL,
  "classSessionId" UUID NOT NULL,
  "date" DATE NOT NULL,
  "status" "ScheduleExceptionStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "schedule_exceptions_studentId_date_classSessionId_key"
  ON "schedule_exceptions"("studentId", "date", "classSessionId");
CREATE INDEX "schedule_exceptions_studentId_semesterId_date_idx"
  ON "schedule_exceptions"("studentId", "semesterId", "date");
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_semesterId_fkey"
  FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_classSessionId_fkey"
  FOREIGN KEY ("classSessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
