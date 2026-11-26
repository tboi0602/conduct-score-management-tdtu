CREATE TYPE "AttendanceImportBatchStatus" AS ENUM (
  'PROCESSING',
  'PARTIALLY_QUEUED',
  'COMPLETED',
  'FAILED'
);

CREATE TABLE "attendance_import_batches" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "createdByUserId" UUID,
  "status" "AttendanceImportBatchStatus" NOT NULL DEFAULT 'PROCESSING',
  "requestedCount" INTEGER NOT NULL,
  "queuedCount" INTEGER NOT NULL DEFAULT 0,
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "acceptedCount" INTEGER NOT NULL DEFAULT 0,
  "rejectedCount" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_import_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attendance_import_batches_counts_check" CHECK (
    "requestedCount" >= 0
    AND "queuedCount" >= 0
    AND "processedCount" >= 0
    AND "acceptedCount" >= 0
    AND "rejectedCount" >= 0
    AND "queuedCount" <= "requestedCount"
    AND "processedCount" <= "queuedCount"
    AND "acceptedCount" + "rejectedCount" <= "requestedCount"
  )
);

ALTER TABLE "attendance_scan_requests" ADD COLUMN "importBatchId" UUID;

CREATE INDEX "attendance_import_batches_eventId_createdAt_id_idx"
  ON "attendance_import_batches"("eventId", "createdAt", "id");
CREATE INDEX "attendance_import_batches_status_createdAt_id_idx"
  ON "attendance_import_batches"("status", "createdAt", "id");
CREATE INDEX "attendance_scan_requests_importBatchId_status_idx"
  ON "attendance_scan_requests"("importBatchId", "status");

ALTER TABLE "attendance_import_batches"
  ADD CONSTRAINT "attendance_import_batches_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_import_batches"
  ADD CONSTRAINT "attendance_import_batches_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_scan_requests"
  ADD CONSTRAINT "attendance_scan_requests_importBatchId_fkey"
  FOREIGN KEY ("importBatchId") REFERENCES "attendance_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
