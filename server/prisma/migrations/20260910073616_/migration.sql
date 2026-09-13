-- DropIndex
DROP INDEX "conduct_scores_semesterId_idx";

-- AlterTable
ALTER TABLE "conduct_scores" ALTER COLUMN "ranking" SET DEFAULT 'POOR';
