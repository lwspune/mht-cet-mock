-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MODERATE', 'HARD');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "difficulty" "Difficulty" NOT NULL DEFAULT 'MODERATE';
