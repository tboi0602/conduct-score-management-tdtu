-- Rename the existing summary in place so identifiers and historical totals remain stable.
ALTER TYPE "TrainingPointStatus" RENAME TO "ConductScoreStatus";
ALTER TABLE "training_points" RENAME TO "conduct_scores";
ALTER TABLE "conduct_scores" RENAME COLUMN "totalPoint" TO "totalScore";
ALTER TABLE "conduct_scores" RENAME CONSTRAINT "training_points_pkey" TO "conduct_scores_pkey";
ALTER TABLE "conduct_scores" RENAME CONSTRAINT "training_points_studentId_fkey" TO "conduct_scores_studentId_fkey";
ALTER TABLE "conduct_scores" RENAME CONSTRAINT "training_points_semesterId_fkey" TO "conduct_scores_semesterId_fkey";
ALTER INDEX "training_points_studentId_semesterId_key" RENAME TO "conduct_scores_studentId_semesterId_key";
ALTER INDEX "training_points_semesterId_idx" RENAME TO "conduct_scores_semesterId_idx";

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "ConductScoreEntrySource" AS ENUM ('EVENT', 'MANUAL_ADJUSTMENT', 'REVERSAL', 'LEGACY_IMPORT');
CREATE TYPE "ConductScoreStatusAction" AS ENUM ('FINALIZED', 'REOPENED');

ALTER TABLE "users" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "conduct_scores"
  ADD COLUMN "finalizedAt" TIMESTAMP(3),
  ADD COLUMN "finalizedByUserId" UUID;

CREATE TABLE "conduct_score_entries" (
  "id" UUID NOT NULL,
  "conductScoreId" UUID NOT NULL,
  "criteriaId" UUID,
  "eventId" UUID,
  "points" INTEGER NOT NULL,
  "source" "ConductScoreEntrySource" NOT NULL,
  "reason" VARCHAR(500),
  "createdByUserId" UUID,
  "reversalOfId" UUID,
  "idempotencyKey" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conduct_score_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conduct_score_criterion_totals" (
  "id" UUID NOT NULL,
  "conductScoreId" UUID NOT NULL,
  "criteriaId" UUID NOT NULL,
  "rawScore" INTEGER NOT NULL DEFAULT 0,
  "cappedScore" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conduct_score_criterion_totals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conduct_score_status_history" (
  "id" UUID NOT NULL,
  "conductScoreId" UUID NOT NULL,
  "action" "ConductScoreStatusAction" NOT NULL,
  "reason" VARCHAR(500),
  "actorUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conduct_score_status_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conduct_score_entries_idempotencyKey_key" ON "conduct_score_entries"("idempotencyKey");
CREATE INDEX "conduct_score_entries_conductScoreId_createdAt_id_idx" ON "conduct_score_entries"("conductScoreId", "createdAt", "id");
CREATE INDEX "conduct_score_entries_criteriaId_conductScoreId_idx" ON "conduct_score_entries"("criteriaId", "conductScoreId");
CREATE INDEX "conduct_score_entries_eventId_conductScoreId_idx" ON "conduct_score_entries"("eventId", "conductScoreId");
CREATE UNIQUE INDEX "conduct_score_criterion_totals_conductScoreId_criteriaId_key" ON "conduct_score_criterion_totals"("conductScoreId", "criteriaId");
CREATE INDEX "conduct_score_criterion_totals_criteriaId_cappedScore_idx" ON "conduct_score_criterion_totals"("criteriaId", "cappedScore");
CREATE INDEX "conduct_score_status_history_conductScoreId_createdAt_id_idx" ON "conduct_score_status_history"("conductScoreId", "createdAt", "id");
CREATE INDEX "conduct_scores_semesterId_status_ranking_id_idx" ON "conduct_scores"("semesterId", "status", "ranking", "id");
CREATE INDEX "conduct_scores_studentId_updatedAt_id_idx" ON "conduct_scores"("studentId", "updatedAt", "id");

ALTER TABLE "conduct_scores" ADD CONSTRAINT "conduct_scores_finalizedByUserId_fkey" FOREIGN KEY ("finalizedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conduct_score_entries" ADD CONSTRAINT "conduct_score_entries_conductScoreId_fkey" FOREIGN KEY ("conductScoreId") REFERENCES "conduct_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conduct_score_entries" ADD CONSTRAINT "conduct_score_entries_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conduct_score_entries" ADD CONSTRAINT "conduct_score_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conduct_score_entries" ADD CONSTRAINT "conduct_score_entries_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conduct_score_entries" ADD CONSTRAINT "conduct_score_entries_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "conduct_score_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conduct_score_criterion_totals" ADD CONSTRAINT "conduct_score_criterion_totals_conductScoreId_fkey" FOREIGN KEY ("conductScoreId") REFERENCES "conduct_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conduct_score_criterion_totals" ADD CONSTRAINT "conduct_score_criterion_totals_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conduct_score_status_history" ADD CONSTRAINT "conduct_score_status_history_conductScoreId_fkey" FOREIGN KEY ("conductScoreId") REFERENCES "conduct_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conduct_score_status_history" ADD CONSTRAINT "conduct_score_status_history_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing summaries become explicit legacy ledger entries without changing their totals.
INSERT INTO "conduct_score_entries" (
  "id", "conductScoreId", "points", "source", "reason", "idempotencyKey", "createdAt"
)
SELECT
  (
    substr(md5(cs."id"::text || ':legacy'), 1, 8) || '-' ||
    substr(md5(cs."id"::text || ':legacy'), 9, 4) || '-' ||
    substr(md5(cs."id"::text || ':legacy'), 13, 4) || '-' ||
    substr(md5(cs."id"::text || ':legacy'), 17, 4) || '-' ||
    substr(md5(cs."id"::text || ':legacy'), 21, 12)
  )::uuid,
  cs."id", cs."totalScore", 'LEGACY_IMPORT',
  'Imported from the previous training point summary',
  'legacy:' || cs."id"::text,
  cs."createdAt"
FROM "conduct_scores" cs;

-- Remove the retired lecturer role. Accounts that also have a supported role are retained.
CREATE TEMP TABLE "_lecturer_only_users" ("id" UUID PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_lecturer_only_users" ("id")
SELECT ur."userId"
FROM "user_roles" ur
JOIN "roles" r ON r."id" = ur."roleId" AND r."name" = 'LECTURER'
WHERE NOT EXISTS (
  SELECT 1
  FROM "user_roles" supported_ur
  JOIN "roles" supported_role ON supported_role."id" = supported_ur."roleId"
  WHERE supported_ur."userId" = ur."userId"
    AND supported_role."name" IN ('ADMIN', 'EVENT_ORGANIZER', 'STUDENT_AFFAIRS', 'STUDENT')
);

UPDATE "attendance_records" ar
SET "scanRequestId" = NULL
WHERE ar."scanRequestId" IN (
  SELECT sr."id" FROM "attendance_scan_requests" sr
  JOIN "_lecturer_only_users" retired ON retired."id" = sr."submittedByUserId"
);
DELETE FROM "attendance_scan_requests" sr
USING "_lecturer_only_users" retired
WHERE sr."submittedByUserId" = retired."id";
DELETE FROM "attendance_sessions" session
USING "_lecturer_only_users" retired
WHERE session."openedByUserId" = retired."id";
DELETE FROM "users" account
USING "_lecturer_only_users" retired
WHERE account."id" = retired."id";
DELETE FROM "roles" WHERE "name" = 'LECTURER';
