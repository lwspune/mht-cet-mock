import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiRequireRole } from '@/lib/auth'
import { z } from 'zod'

const saveSchema = z.object({
  questionId: z.string(),
  selectedOptionId: z.string().nullable(),
  isFlagged: z.boolean().optional(),
  timeSpentSecs: z.number().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiRequireRole('STUDENT')
  if ('error' in auth) return auth.error
  const { user: student } = auth

  const attempt = await db.mockAttempt.findUnique({
    where: { id: params.id },
    include: { answers: true },
  })

  if (!attempt || attempt.studentId !== student.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(attempt.answers)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiRequireRole('STUDENT')
  if ('error' in auth) return auth.error
  const { user: student } = auth

  const body = await request.json()
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const attempt = await db.mockAttempt.findUnique({
    where: { id: params.id },
    select: { studentId: true, status: true },
  })

  if (!attempt || attempt.studentId !== student.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (attempt.status === 'SUBMITTED') {
    return NextResponse.json({ error: 'Attempt already submitted' }, { status: 409 })
  }

  const { questionId, selectedOptionId, isFlagged, timeSpentSecs } = parsed.data

  const answer = await db.attemptAnswer.update({
    where: { attemptId_questionId: { attemptId: params.id, questionId } },
    data: {
      selectedOptionId,
      ...(isFlagged !== undefined ? { isFlagged } : {}),
      ...(timeSpentSecs !== undefined ? { timeSpentSecs } : {}),
    },
  })

  return NextResponse.json(answer)
}
