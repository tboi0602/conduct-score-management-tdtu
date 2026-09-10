ALTER TABLE "events"
ADD COLUMN "attendanceRadiusMeters" INTEGER NOT NULL DEFAULT 100;

CREATE TYPE "AttendanceSessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "AttendanceScanStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE "AttendanceScanSource" AS ENUM ('STUDENT_QR', 'STAFF_BARCODE', 'MANUAL_ENTRY');

CREATE TABLE "attendance_sessions" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "direction" "AttendanceDirection" NOT NULL,
  "status" "AttendanceSessionStatus" NOT NULL DEFAULT 'OPEN',
  "centerLatitude" DOUBLE PRECISION NOT NULL,
  "centerLongitude" DOUBLE PRECISION NOT NULL,
  "centerAccuracyMeters" DOUBLE PRECISION NOT NULL,
  "radiusMeters" INTEGER NOT NULL,
  "openedByUserId" UUID NOT NULL,
  "closedByUserId" UUID,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_scan_requests" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "sessionId" UUID,
  "studentId" UUID NOT NULL,
  "submittedByUserId" UUID NOT NULL,
  "direction" "AttendanceDirection" NOT NULL,
  "source" "AttendanceScanSource" NOT NULL,
  "requestedStatus" "AttendanceStatus" NOT NULL DEFAULT 'ATTENDED',
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "accuracyMeters" DOUBLE PRECISION,
  "status" "AttendanceScanStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason" VARCHAR(100),
  "correlationId" UUID NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_scan_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbox_events" (
  "id" UUID NOT NULL,
  "aggregateType" VARCHAR(50) NOT NULL,
  "aggregateId" UUID NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "payload" JSONB NOT NULL,
  "correlationId" UUID NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  "lastError" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "attendance_records" ADD COLUMN "scanRequestId" UUID;

CREATE UNIQUE INDEX "attendance_sessions_one_open_per_event_idx"
ON "attendance_sessions"("eventId") WHERE "status" = 'OPEN';
CREATE INDEX "attendance_sessions_eventId_status_openedAt_id_idx" ON "attendance_sessions"("eventId", "status", "openedAt", "id");
CREATE INDEX "attendance_sessions_openedByUserId_openedAt_idx" ON "attendance_sessions"("openedByUserId", "openedAt");
CREATE UNIQUE INDEX "attendance_scan_requests_correlationId_key" ON "attendance_scan_requests"("correlationId");
CREATE INDEX "attendance_scan_requests_eventId_status_createdAt_id_idx" ON "attendance_scan_requests"("eventId", "status", "createdAt", "id");
CREATE INDEX "attendance_scan_requests_studentId_status_createdAt_id_idx" ON "attendance_scan_requests"("studentId", "status", "createdAt", "id");
CREATE INDEX "attendance_scan_requests_sessionId_createdAt_id_idx" ON "attendance_scan_requests"("sessionId", "createdAt", "id");
CREATE INDEX "outbox_events_publishedAt_nextAttemptAt_createdAt_id_idx" ON "outbox_events"("publishedAt", "nextAttemptAt", "createdAt", "id");
CREATE INDEX "outbox_events_aggregateType_aggregateId_createdAt_idx" ON "outbox_events"("aggregateType", "aggregateId", "createdAt");
CREATE UNIQUE INDEX "attendance_records_scanRequestId_key" ON "attendance_records"("scanRequestId");

ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_scan_requests" ADD CONSTRAINT "attendance_scan_requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_scan_requests" ADD CONSTRAINT "attendance_scan_requests_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_scan_requests" ADD CONSTRAINT "attendance_scan_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_scan_requests" ADD CONSTRAINT "attendance_scan_requests_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_scanRequestId_fkey" FOREIGN KEY ("scanRequestId") REFERENCES "attendance_scan_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
