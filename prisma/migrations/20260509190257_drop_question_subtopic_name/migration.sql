/*
  Warnings:

  - You are about to drop the column `subtopicName` on the `questions` table. All data in the column will be lost.

  Subtopic data has already been migrated to the Subtopic table via
  scripts/backfill-subtopics.ts (see prior migration 20260509131652_add_subtopic_table).
  Every Question with a non-null subtopicName has a matching subtopicId.
*/
-- AlterTable
ALTER TABLE "questions" DROP COLUMN "subtopicName";
