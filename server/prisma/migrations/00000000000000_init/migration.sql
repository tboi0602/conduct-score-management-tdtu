-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'GRADUATED', 'SUSPENDED', 'DROPPED_OUT');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'FAILED_GPS');

-- CreateEnum
CREATE TYPE "WarningSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "studentCode" VARCHAR(20) NOT NULL,
    "fullName" VARCHAR(100) NOT NULL,
    "dateOfBirth" DATE,
    "gender" "Gender",
    "className" VARCHAR(50) NOT NULL,
    "faculty" VARCHAR(100) NOT NULL,
    "email" VARCHAR(120),
    "phone" VARCHAR(15),
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "baseScore" INTEGER NOT NULL DEFAULT 0,
    "currentScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "locationName" VARCHAR(120) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 200,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "maxScoreDeduction" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_enrollments" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "requiredMandatory" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "event_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "scanCode" VARCHAR(40) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "gpsVerified" BOOLEAN NOT NULL DEFAULT false,
    "distanceMeters" DOUBLE PRECISION,
    "ipAddress" VARCHAR(45),
    "deviceId" VARCHAR(80),
    "metadata" JSONB,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" VARCHAR(80) NOT NULL,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warnings" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "eventId" UUID,
    "ruleCode" VARCHAR(60) NOT NULL,
    "severity" "WarningSeverity" NOT NULL DEFAULT 'MEDIUM',
    "reason" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_studentCode_key" ON "students"("studentCode");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE INDEX "students_className_idx" ON "students"("className");

-- CreateIndex
CREATE INDEX "students_faculty_idx" ON "students"("faculty");

-- CreateIndex
CREATE UNIQUE INDEX "events_code_key" ON "events"("code");

-- CreateIndex
CREATE INDEX "events_startAt_endAt_idx" ON "events"("startAt", "endAt");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "event_enrollments_studentId_idx" ON "event_enrollments"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "event_enrollments_eventId_studentId_key" ON "event_enrollments"("eventId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_idempotencyKey_key" ON "attendance_logs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "attendance_logs_scannedAt_idx" ON "attendance_logs"("scannedAt");

-- CreateIndex
CREATE INDEX "attendance_logs_status_idx" ON "attendance_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_eventId_studentId_key" ON "attendance_logs"("eventId", "studentId");

-- CreateIndex
CREATE INDEX "warnings_studentId_createdAt_idx" ON "warnings"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "warnings_ruleCode_idx" ON "warnings"("ruleCode");

-- AddForeignKey
ALTER TABLE "event_enrollments" ADD CONSTRAINT "event_enrollments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_enrollments" ADD CONSTRAINT "event_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

