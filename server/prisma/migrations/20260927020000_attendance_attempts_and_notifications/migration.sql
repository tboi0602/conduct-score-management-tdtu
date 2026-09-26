CREATE TYPE "AttendanceFailureCategory" AS ENUM (
  'NETWORK_ERROR',
  'QR_ERROR',
  'SESSION_EXPIRED',
  'TIMEOUT',
  'LOCATION_ERROR',
  'SERVICE_ERROR',
  'OTHER'
);

CREATE TYPE "UserNotificationType" AS ENUM ('APPEAL_APPROVED', 'APPEAL_REJECTED');

ALTER TABLE "attendance_scan_requests"
  ADD COLUMN "clientAttemptId" UUID;

CREATE UNIQUE INDEX "attendance_scan_requests_clientAttemptId_key"
  ON "attendance_scan_requests"("clientAttemptId");

ALTER TABLE "attendance_appeals"
  ALTER COLUMN "target" DROP NOT NULL,
  ADD COLUMN "failureCategory" "AttendanceFailureCategory",
  ADD COLUMN "failedAt" TIMESTAMP(3);

CREATE TABLE "user_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "type" "UserNotificationType" NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" VARCHAR(1000) NOT NULL,
  "entityId" UUID,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "user_notifications_userId_readAt_createdAt_id_idx"
  ON "user_notifications"("userId", "readAt", "createdAt", "id");
