ALTER TYPE "UserNotificationType" ADD VALUE IF NOT EXISTS 'CONDUCT_SCORE_WARNING';

CREATE TYPE "ConductScoreWarningStatus" AS ENUM ('ACTIVE', 'RESOLVED');
CREATE TYPE "AttendanceIncidentStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "conduct_score_warnings" (
  "id" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "semesterId" UUID NOT NULL,
  "observedScore" INTEGER NOT NULL,
  "threshold" INTEGER NOT NULL DEFAULT 80,
  "status" "ConductScoreWarningStatus" NOT NULL DEFAULT 'ACTIVE',
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conduct_score_warnings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_client_incidents" (
  "id" UUID NOT NULL,
  "clientAttemptId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "direction" "AttendanceDirection",
  "failureCategory" "AttendanceFailureCategory" NOT NULL,
  "failedAt" TIMESTAMP(3) NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "accuracyMeters" DOUBLE PRECISION,
  "tokenFingerprint" VARCHAR(64),
  "clientOnline" BOOLEAN NOT NULL,
  "userAgent" VARCHAR(500),
  "payload" JSONB NOT NULL,
  "digest" VARCHAR(64) NOT NULL,
  "status" "AttendanceIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "resolutionNote" VARCHAR(1000),
  "resolvedByUserId" UUID,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_client_incidents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_access_audits" (
  "id" UUID NOT NULL,
  "requestId" VARCHAR(100) NOT NULL,
  "clientAttemptId" UUID,
  "userId" UUID,
  "studentId" UUID,
  "eventId" UUID,
  "method" VARCHAR(10) NOT NULL,
  "path" VARCHAR(255) NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "instance" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_access_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conduct_score_warnings_studentId_semesterId_key" ON "conduct_score_warnings"("studentId", "semesterId");
CREATE INDEX "conduct_score_warnings_studentId_status_createdAt_id_idx" ON "conduct_score_warnings"("studentId", "status", "createdAt", "id");
CREATE INDEX "conduct_score_warnings_semesterId_status_observedScore_id_idx" ON "conduct_score_warnings"("semesterId", "status", "observedScore", "id");
CREATE UNIQUE INDEX "attendance_client_incidents_clientAttemptId_key" ON "attendance_client_incidents"("clientAttemptId");
CREATE INDEX "attendance_client_incidents_eventId_status_failedAt_id_idx" ON "attendance_client_incidents"("eventId", "status", "failedAt", "id");
CREATE INDEX "attendance_client_incidents_studentId_failedAt_id_idx" ON "attendance_client_incidents"("studentId", "failedAt", "id");
CREATE UNIQUE INDEX "attendance_access_audits_requestId_key" ON "attendance_access_audits"("requestId");
CREATE INDEX "attendance_access_audits_eventId_createdAt_id_idx" ON "attendance_access_audits"("eventId", "createdAt", "id");
CREATE INDEX "attendance_access_audits_clientAttemptId_createdAt_idx" ON "attendance_access_audits"("clientAttemptId", "createdAt");
CREATE INDEX "attendance_access_audits_userId_createdAt_idx" ON "attendance_access_audits"("userId", "createdAt");

ALTER TABLE "conduct_score_warnings" ADD CONSTRAINT "conduct_score_warnings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conduct_score_warnings" ADD CONSTRAINT "conduct_score_warnings_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_client_incidents" ADD CONSTRAINT "attendance_client_incidents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_client_incidents" ADD CONSTRAINT "attendance_client_incidents_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_client_incidents" ADD CONSTRAINT "attendance_client_incidents_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_access_audits" ADD CONSTRAINT "attendance_access_audits_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_access_audits" ADD CONSTRAINT "attendance_access_audits_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
