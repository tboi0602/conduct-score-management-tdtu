ALTER TABLE "events"
ADD COLUMN "descriptionPreview" VARCHAR(500) NOT NULL DEFAULT '';

UPDATE "events"
SET "descriptionPreview" = CASE
  WHEN LENGTH(TRIM(REGEXP_REPLACE(REGEXP_REPLACE("description", '<[^>]*>', ' ', 'g'), '\s+', ' ', 'g'))) > 360
    THEN LEFT(TRIM(REGEXP_REPLACE(REGEXP_REPLACE("description", '<[^>]*>', ' ', 'g'), '\s+', ' ', 'g')), 360) || '...'
  ELSE TRIM(REGEXP_REPLACE(REGEXP_REPLACE("description", '<[^>]*>', ' ', 'g'), '\s+', ' ', 'g'))
END;
