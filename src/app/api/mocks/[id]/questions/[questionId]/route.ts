import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiRequireRole } from '@/lib/auth'
import { rescoreSubmittedAttempts } from '@/lib/scoring'
import { z } from 'zod'

const optionUpdateSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  imageUrl: z.string().optional(),
  isCorrect: z.boolean(),
})

const updateSchema = z.object({
  chapterId: z.string().min(1),
  text: z.string().min(1),
  imageUrl: z.string().optional(),
  solution: z.string().optional(),
  pyqYear: z.string().nullable().optional(),
  difficulty: z.enum(['EASY', 'MODERATE', 'HARD']).default('MODERATE'),
  marks: z.number(),
  negMarks: z.number(),
  options: z.array(optionUpdateSchema).length(4),
})

async function resolveQuestion(mockId: string, questionId: string, teacherId: string) {
  const mock = await db.mock.findUnique({ where: { id: mockId } })
  if (!mock || mock.createdBy !== teacherId) return null
  const question = await db.question.findUnique({ where: { id: questionId } })
  if (!question || question.mockId !== mockId) return null
  return question
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error
  const { user: teacher } = auth

  const question = await resolveQuestion(params.id, params.questionId, teacher.id)
  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { chapterId, text, imageUrl, solution, pyqYear, difficulty, marks, negMarks, options } = parsed.data

  const rescoredAttempts = await db.$transaction(async (tx) => {
    await tx.question.update({
      where: { id: params.questionId },
      data: { chapterId, text, imageUrl: imageUrl ?? null, solution: solution ?? null, pyqYear: pyqYear ?? null, difficulty, marks, negMarks },
    })
    await Promise.all(
      options.map((opt) =>
        tx.option.update({
          where: { id: opt.id },
          data: { text: opt.text, imageUrl: opt.imageUrl ?? null, isCorrect: opt.isCorrect },
        })
      )
    )
    return rescoreSubmittedAttempts(params.id, tx as Parameters<Parameters<typeof db.$transaction>[0]>[0])
  })

  const updated = await db.question.findUnique({
    where: { id: params.questionId },
    include: { options: true, chapter: true },
  })
  return NextResponse.json({ ...updated, rescoredAttempts })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error
  const { user: teacher } = auth

  const question = await resolveQuestion(params.id, params.questionId, teacher.id)
  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await db.question.delete({ where: { id: params.questionId } })
  } catch {
    return NextResponse.json(
      { error: 'Cannot delete a question that has student attempt data' },
      { status: 409 }
    )
  }

  return NextResponse.json({ success: true })
}
