/**
 * One-shot backfill: for every distinct (chapterId, subtopicName) pair,
 * upsert a Subtopic row and link matching Questions to it via subtopicId.
 *
 * Idempotent: re-running upserts the same Subtopic rows (matched on the
 * unique (chapterId, name) index) and re-points Questions to the same FK.
 *
 * Run with: npx ts-node --project tsconfig.seed.json scripts/backfill-subtopics.ts
 */
import * as dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
})

async function main() {
  const pairs = await prisma.question.groupBy({
    by: ['chapterId', 'subtopicName'],
    where: { subtopicName: { not: null } },
    _count: true,
  })
  console.log(`Found ${pairs.length} distinct (chapter, subtopic) pairs`)

  let upserted = 0
  let linked = 0
  for (const { chapterId, subtopicName } of pairs) {
    if (!subtopicName) continue
    const subtopic = await prisma.subtopic.upsert({
      where: { chapterId_name: { chapterId, name: subtopicName } },
      update: {},
      create: { chapterId, name: subtopicName },
    })
    upserted++
    const result = await prisma.question.updateMany({
      where: { chapterId, subtopicName },
      data: { subtopicId: subtopic.id },
    })
    linked += result.count
  }
  console.log(`Done. subtopics_upserted=${upserted}  questions_linked=${linked}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
