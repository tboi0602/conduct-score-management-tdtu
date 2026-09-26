CREATE TYPE "AttendanceAppealTarget" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'BOTH');
CREATE TYPE "AttendanceAppealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "attendance_appeals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "studentId" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "target" "AttendanceAppealTarget" NOT NULL,
  "status" "AttendanceAppealStatus" NOT NULL DEFAULT 'PENDING',
  "explanation" VARCHAR(2000) NOT NULL,
  "reviewNote" VARCHAR(1000),
  "reviewedByUserId" UUID,
  "reviewedAt" TIMESTAMP(3),
  "evidenceKey" VARCHAR(500) NOT NULL,
  "evidenceName" VARCHAR(255) NOT NULL,
  "evidenceMime" VARCHAR(50) NOT NULL,
  "evidenceSize" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_appeals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_appeal_attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "studentId" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "totalCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_appeal_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_appeals_evidenceKey_key" ON "attendance_appeals"("evidenceKey");
CREATE UNIQUE INDEX "attendance_appeals_studentId_eventId_attemptNumber_key" ON "attendance_appeals"("studentId", "eventId", "attemptNumber");
CREATE UNIQUE INDEX "attendance_appeals_one_pending_per_event_idx" ON "attendance_appeals"("studentId", "eventId") WHERE "status" = 'PENDING';
CREATE INDEX "attendance_appeals_studentId_createdAt_id_idx" ON "attendance_appeals"("studentId", "createdAt", "id");
CREATE INDEX "attendance_appeals_eventId_status_createdAt_id_idx" ON "attendance_appeals"("eventId", "status", "createdAt", "id");
CREATE INDEX "attendance_appeals_status_reviewedAt_idx" ON "attendance_appeals"("status", "reviewedAt");
CREATE UNIQUE INDEX "attendance_appeal_attempts_studentId_eventId_key" ON "attendance_appeal_attempts"("studentId", "eventId");
CREATE INDEX "attendance_appeal_attempts_eventId_idx" ON "attendance_appeal_attempts"("eventId");

ALTER TABLE "attendance_appeals" ADD CONSTRAINT "attendance_appeals_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_appeals" ADD CONSTRAINT "attendance_appeals_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_appeals" ADD CONSTRAINT "attendance_appeals_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_appeal_attempts" ADD CONSTRAINT "attendance_appeal_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_appeal_attempts" ADD CONSTRAINT "attendance_appeal_attempts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
