ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "googleSubject" VARCHAR(255);
CREATE UNIQUE INDEX "users_googleSubject_key" ON "users"("googleSubject");
ALTER TABLE "students" ALTER COLUMN "classId" DROP NOT NULL;
