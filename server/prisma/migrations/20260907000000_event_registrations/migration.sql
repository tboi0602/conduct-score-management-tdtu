CREATE TYPE "EventRegistrationStatus" AS ENUM ('REGISTERED', 'CANCELLED');

ALTER TABLE "events"
ADD COLUMN "capacity" INTEGER,
ADD COLUMN "registrationStart" TIMESTAMP(3),
ADD COLUMN "registrationEnd" TIMESTAMP(3);

UPDATE "events"
SET "registrationStart" = LEAST("createdAt", "timeStart"),
    "registrationEnd" = "timeStart";

ALTER TABLE "events"
ALTER COLUMN "registrationStart" SET NOT NULL,
ALTER COLUMN "registrationEnd" SET NOT NULL,
ADD CONSTRAINT "events_capacity_check" CHECK ("capacity" IS NULL OR "capacity" > 0),
ADD CONSTRAINT "events_registration_window_check" CHECK ("registrationStart" < "registrationEnd" AND "registrationEnd" <= "timeStart");

CREATE TABLE "event_registrations" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "status" "EventRegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TIMESTAMP(3),
  "registeredByUserId" UUID,
  "cancelledByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_registrations_eventId_studentId_key" ON "event_registrations"("eventId", "studentId");
CREATE INDEX "event_registrations_eventId_status_registeredAt_id_idx" ON "event_registrations"("eventId", "status", "registeredAt", "id");
CREATE INDEX "event_registrations_studentId_status_registeredAt_id_idx" ON "event_registrations"("studentId", "status", "registeredAt", "id");
CREATE INDEX "event_registrations_status_eventId_idx" ON "event_registrations"("status", "eventId");
CREATE INDEX "events_registrationStart_registrationEnd_idx" ON "events"("registrationStart", "registrationEnd");

ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
