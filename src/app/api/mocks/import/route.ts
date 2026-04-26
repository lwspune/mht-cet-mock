import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { apiRequireRole } from '@/lib/auth'
import type { ImportResponse } from '@/lib/import-types'

const questionSchema = z.object({
  tempId: z.string(),
  chapterName: z.string(),
  resolvedSubjectKey: z.string(),
  text: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  solution: z.string().nullable(),
})

const mockPayloadSchema = z.object({
  title: z.string().min(3),
  subjectKey: z.string().min(1),
  questions: z.array(questionSchema).min(1),
})

const importSchema = z.object({
  durationMins: z.number().int().min(10).max(360),
  marksCorrect: z.number().min(0),
  marksWrong: z.number().min(0),
  mocks: z.array(mockPayloadSchema).min(1),
})

type ResolvedQuestion = z.infer<typeof questionSchema> & { chapterId: string }

type ValidatedMock = {
  title: string
  subjectId: string
  resolved: ResolvedQuestion[]
}

export async function POST(request: NextRequest) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error
  const { user: teacher } = auth

  const body = await request.json()
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { durationMins, marksCorrect, marksWrong, mocks } = parsed.data

  // Pre-load all chapters once to avoid per-question queries
  const allChapters = await db.chapter.findMany({ include: { subject: true } })
  const chapterMap = new Map<string, string>() // "SubjectKey|ChapterName" → chapterId
  for (const ch of allChapters) {
    chapterMap.set(`${ch.subject.name}|${ch.name}`, ch.id)
  }

  const subjectRecords = await db.subject.findMany()
  const subjectIdMap = new Map(subjectRecords.map((s) => [s.name, s.id]))

  // Phase 1: Validate ALL mocks before writing anything.
  // If any mock fails, return 400 without starting a single transaction.
  const validatedMocks: ValidatedMock[] = []

  for (const mockPayload of mocks) {
    const subjectId = subjectIdMap.get(mockPayload.subjectKey)
    if (!subjectId) {
      return NextResponse.json({ error: `Unknown subject: ${mockPayload.subjectKey}` }, { status: 400 })
    }

    const resolved = mockPayload.questions.map((q) => {
      const chapterId = chapterMap.get(`${q.resolvedSubjectKey}|${q.chapterName}`)
      return { ...q, chapterId }
    })

    const unresolved = resolved.filter((q) => !q.chapterId)
    if (unresolved.length > 0) {
      return NextResponse.json({
        error: `Could not resolve chapters for ${unresolved.length} question(s) in ${mockPayload.subjectKey}`,
        unresolved: unresolved.map((q) => q.tempId),
      }, { status: 400 })
    }

    validatedMocks.push({
      title: mockPayload.title,
      subjectId,
      resolved: resolved as ResolvedQuestion[],
    })
  }

  // Phase 2: All validation passed — run one transaction per mock in parallel.
  const results = await Promise.all(
    validatedMocks.map(({ title, subjectId, resolved }) =>
      db.$transaction(async (tx) => {
        const mock = await tx.mock.create({
          data: {
            title,
            subjectId,
            createdBy: teacher.id,
            durationMins,
            marksCorrect,
            marksWrong,
          },
        })

        // Create questions without nested options to keep each statement small
        const createdQuestions = await Promise.all(
          resolved.map((q, i) =>
            tx.question.create({
              data: {
                mockId: mock.id,
                chapterId: q.chapterId,
                text: q.text,
                marks: marksCorrect,
                negMarks: marksWrong,
                orderIndex: i + 1,
                solution: q.solution,
              },
            })
          )
        )

        // Batch all option inserts in one statement instead of N round-trips
        await tx.option.createMany({
          data: resolved.flatMap((q, i) =>
            q.options.map((optText, idx) => ({
              questionId: createdQuestions[i].id,
              text: optText,
              isCorrect: idx === q.correctIndex,
            }))
          ),
        })

        return { id: mock.id, title: mock.title, questionCount: resolved.length }
      }, { timeout: 30000 })
    )
  )

  const response: ImportResponse = { mocks: results }
  return NextResponse.json(response, { status: 201 })
}
