/*
  Warnings:

  - Made the column `contentHash` on table `questions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "questions" ALTER COLUMN "contentHash" SET NOT NULL;
