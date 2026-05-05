import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { apiRequireRole } from '@/lib/auth'
import type { ImportResponse } from '@/lib/import-types'

const questionSchema = z.object({
  tempId: z.string(),
  chapterName: z.string(),
  subtopicName: z.string().nullable(),
  resolvedSubjectKey: z.string(),
  text: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  solution: z.string().nullable(),
  pyqYear: z.string().nullable(),
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

  const courseConfigs = await db.courseSubjectConfig.findMany({
    where: { course: { slug: teacher.courseSlug } },
    include: { subject: true },
  })
  const validSubjectMap = new Map(
    courseConfigs.map((c) => [c.subject.name.trim().toLowerCase(), c.subjectId])
  )

  // Phase 1: Validate ALL mocks before writing anything.
  // If any mock fails, return 400 without starting a single transaction.
  const validatedMocks: ValidatedMock[] = []

  for (const mockPayload of mocks) {
    const normalizedKey = mockPayload.subjectKey.trim().toLowerCase()
    const subjectId = validSubjectMap.get(normalizedKey)
    if (!subjectId) {
      return NextResponse.json(
        { error: `Subject '${mockPayload.subjectKey}' not found in course '${teacher.courseSlug}'` },
        { status: 400 }
      )
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

  // Phase 2: All validation passed — write one mock at a time.
  // Sequential $transaction([...]) avoids interactive transaction timeouts on Accelerate.
  // All IDs are pre-generated so every operation in the batch is independent.
  const results: ImportResponse['mocks'] = []

  try {
    for (const { title, subjectId, resolved } of validatedMocks) {
      const mockId = randomUUID()

      const questionData = resolved.map((q, i) => ({
        id: randomUUID(),
        mockId,
        chapterId: q.chapterId,
        text: q.text,
        marks: marksCorrect,
        negMarks: marksWrong,
        orderIndex: i + 1,
        solution: q.solution,
        subtopicName: q.subtopicName,
        pyqYear: q.pyqYear,
      }))

      const optionData = resolved.flatMap((q, i) =>
        q.options.map((optText, idx) => ({
          questionId: questionData[i].id,
          text: optText,
          isCorrect: idx === q.correctIndex,
        }))
      )

      await db.$transaction([
        db.mock.create({ data: { id: mockId, title, subjectId, createdBy: teacher.id, courseSlug: teacher.courseSlug, durationMins, marksCorrect, marksWrong } }),
        db.question.createMany({ data: questionData }),
        db.option.createMany({ data: optionData }),
      ])

      results.push({ id: mockId, title, questionCount: resolved.length })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[import] transaction failed:', message)
    return NextResponse.json({ error: `DB write failed: ${message}` }, { status: 500 })
  }

  return NextResponse.json({ mocks: results } satisfies ImportResponse, { status: 201 })
}
