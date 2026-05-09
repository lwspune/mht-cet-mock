/**
 * One-shot backfill: compute contentHash for every existing Question.
 *
 * Idempotent — re-running recomputes and overwrites every row.
 * Run with: npx ts-node --project tsconfig.seed.json scripts/backfill-content-hash.ts
 */
import * as dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'
import { computeContentHashFromOptions } from '../src/lib/questions/hash'

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
})

async function main() {
  const questions = await prisma.question.findMany({
    select: { id: true, text: true, options: { select: { text: true, isCorrect: true } } },
  })
  console.log(`Hashing ${questions.length} questions…`)

  let updated = 0
  let skipped = 0
  for (const q of questions) {
    const correctCount = q.options.filter((o) => o.isCorrect).length
    if (q.options.length !== 4 || correctCount !== 1) {
      console.warn(`Skipping ${q.id}: ${q.options.length} options, ${correctCount} correct`)
      skipped++
      continue
    }
    const hash = computeContentHashFromOptions({ text: q.text, options: q.options })
    await prisma.question.update({ where: { id: q.id }, data: { contentHash: hash } })
    updated++
  }
  console.log(`Done. updated=${updated}  skipped=${skipped}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
