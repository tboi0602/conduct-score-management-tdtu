-- Trigram indexes support case-insensitive substring searches (ILIKE).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "criteria_createdAt_id_idx" ON "criteria"("createdAt", "id");
CREATE INDEX "criteria_maxPoints_idx" ON "criteria"("maxPoints");
CREATE INDEX "criteria_title_trgm_idx" ON "criteria" USING GIN ("title" gin_trgm_ops);

CREATE INDEX "events_createdAt_id_idx" ON "events"("createdAt", "id");
CREATE INDEX "events_criteriaId_createdAt_id_idx" ON "events"("criteriaId", "createdAt", "id");
CREATE INDEX "events_semesterId_createdAt_id_idx" ON "events"("semesterId", "createdAt", "id");
CREATE INDEX "events_type_createdAt_id_idx" ON "events"("type", "createdAt", "id");
CREATE INDEX "events_checkInMode_createdAt_id_idx" ON "events"("checkInMode", "createdAt", "id");
CREATE INDEX "events_name_trgm_idx" ON "events" USING GIN ("name" gin_trgm_ops);
