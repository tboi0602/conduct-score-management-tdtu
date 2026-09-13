ALTER TABLE "events" ADD COLUMN "registeredCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "events" e
SET "registeredCount" = counts.total
FROM (
  SELECT "eventId", COUNT(*)::INTEGER AS total
  FROM "event_registrations"
  WHERE "status" = 'REGISTERED'
  GROUP BY "eventId"
) counts
WHERE e."id" = counts."eventId";

ALTER TABLE "events"
ADD CONSTRAINT "events_registered_count_check" CHECK ("registeredCount" >= 0);
