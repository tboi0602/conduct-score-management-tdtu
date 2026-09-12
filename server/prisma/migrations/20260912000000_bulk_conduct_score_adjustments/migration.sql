ALTER TABLE "criteria"
ADD COLUMN "defaultPoints" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "criteria"
ADD CONSTRAINT "criteria_default_points_range"
CHECK ("defaultPoints" >= 0 AND "defaultPoints" <= "maxPoints");

ALTER TABLE "conduct_score_entries"
ADD COLUMN "result" VARCHAR(100) NOT NULL DEFAULT 'RECORDED';

UPDATE "conduct_score_entries"
SET "result" = CASE
  WHEN "source" = 'EVENT' THEN 'ATTENDED'
  WHEN "source" = 'REVERSAL' THEN 'REVERSED'
  WHEN "source" = 'LEGACY_IMPORT' THEN 'IMPORTED'
  ELSE 'ADJUSTED'
END;
