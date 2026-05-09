import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiRequireRole } from '@/lib/auth'
import { computeContentHashFromOptions } from '@/lib/questions/hash'
import { z } from 'zod'

const optionSchema = z.object({
  text: z.string().min(1),
  imageUrl: z.string().optional(),
  isCorrect: z.boolean(),
})

const createSchema = z.object({
  chapterId: z.string(),
  text: z.string().min(1),
  imageUrl: z.string().optional(),
  solution: z.string().optional(),
  pyqYear: z.string().optional(),
  difficulty: z.enum(['EASY', 'MODERATE', 'HARD']).default('MODERATE'),
  subtopicId: z.string().optional(),
  newSubtopicName: z.string().min(1).optional(),
  marks: z.number().default(2),
  negMarks: z.number().default(0),
  options: z.array(optionSchema).length(4),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error
  const { user: teacher } = auth

  const mock = await db.mock.findUnique({ where: { id: params.id } })
  if (!mock || mock.createdBy !== teacher.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const questions = await db.question.findMany({
    where: { mockId: params.id },
    include: { options: true, chapter: { include: { subject: true } } },
    orderBy: { orderIndex: 'asc' },
  })

  return NextResponse.json(questions)
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error
  const { user: teacher } = auth

  const mock = await db.mock.findUnique({ where: { id: params.id } })
  if (!mock || mock.createdBy !== teacher.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.subtopicId && parsed.data.newSubtopicName) {
    return NextResponse.json(
      { error: 'Provide either subtopicId or newSubtopicName, not both' },
      { status: 400 }
    )
  }

  let subtopicId: string | null = parsed.data.subtopicId ?? null
  if (parsed.data.newSubtopicName) {
    const created = await db.subtopic.upsert({
      where: { chapterId_name: { chapterId: parsed.data.chapterId, name: parsed.data.newSubtopicName } },
      update: {},
      create: { chapterId: parsed.data.chapterId, name: parsed.data.newSubtopicName },
    })
    subtopicId = created.id
  }

  const count = await db.question.count({ where: { mockId: params.id } })
  const contentHash = computeContentHashFromOptions({
    text: parsed.data.text,
    options: parsed.data.options,
  })

  const question = await db.question.create({
    data: {
      mockId: params.id,
      chapterId: parsed.data.chapterId,
      text: parsed.data.text,
      imageUrl: parsed.data.imageUrl,
      solution: parsed.data.solution ?? null,
      pyqYear: parsed.data.pyqYear ?? null,
      difficulty: parsed.data.difficulty,
      subtopicId,
      contentHash,
      marks: parsed.data.marks,
      negMarks: parsed.data.negMarks,
      orderIndex: count + 1,
      options: { create: parsed.data.options },
    },
    include: { options: true, chapter: true },
  })

  return NextResponse.json(question, { status: 201 })
}
