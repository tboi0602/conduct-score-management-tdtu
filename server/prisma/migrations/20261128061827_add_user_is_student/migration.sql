-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isStudent" BOOLEAN NOT NULL DEFAULT false;

-- RenameIndex
ALTER INDEX "roles_name_key" RENAME TO "roles_code_key";
