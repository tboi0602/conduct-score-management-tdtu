ALTER TABLE "events"
ADD COLUMN "googleFormUrl" VARCHAR(2048);

DELETE FROM "event_registrations"
USING "events"
WHERE "event_registrations"."eventId" = "events"."id"
  AND "events"."deliveryMode" = 'ONLINE';

ALTER TABLE "events"
DROP CONSTRAINT IF EXISTS "events_registration_window_check",
ALTER COLUMN "registrationStart" DROP NOT NULL,
ALTER COLUMN "registrationEnd" DROP NOT NULL;

UPDATE "events"
SET "registeredCount" = 0,
    "capacity" = NULL,
    "registrationStart" = NULL,
    "registrationEnd" = NULL,
    "checkInMode" = 'ONE_WAY'
WHERE "deliveryMode" = 'ONLINE';

ALTER TABLE "events"
ADD CONSTRAINT "events_registration_window_check" CHECK (
  (
    "deliveryMode" = 'OFFLINE'
    AND "registrationStart" IS NOT NULL
    AND "registrationEnd" IS NOT NULL
    AND "registrationStart" < "registrationEnd"
    AND "registrationEnd" <= "timeStart"
  )
  OR
  (
    "deliveryMode" = 'ONLINE'
    AND "registrationStart" IS NULL
    AND "registrationEnd" IS NULL
    AND "capacity" IS NULL
    AND "registeredCount" = 0
    AND "checkInMode" = 'ONE_WAY'
  )
);
