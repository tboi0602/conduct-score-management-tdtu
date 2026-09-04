ALTER TABLE "users" ADD COLUMN "refreshTokenHash" VARCHAR(64);
ALTER TABLE "users" ADD COLUMN "refreshTokenExpiresAt" TIMESTAMP(3);
