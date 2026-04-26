import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiRequireRole } from '@/lib/auth'
import { z } from 'zod'

const startSchema = z.object({ mockId: z.string() })

export async function POST(request: NextRequest) {
  const auth = await apiRequireRole('STUDENT')
  if ('error' in auth) return auth.error
  const { user: student } = auth

  const body = await request.json()
  const parsed = startSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { mockId } = parsed.data

  const mock = await db.mock.findUnique({
    where: { id: mockId },
    include: { questions: { select: { id: true } } },
  })

  if (!mock || !mock.isPublished) {
    return NextResponse.json({ error: 'Mock not found' }, { status: 404 })
  }

  const existing = await db.mockAttempt.findUnique({
    where: { mockId_studentId: { mockId, studentId: student.id } },
  })

  if (existing) {
    if (existing.status === 'SUBMITTED') {
      return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
    }
    return NextResponse.json(existing)
  }

  const attempt = await db.mockAttempt.create({
    data: {
      mockId,
      studentId: student.id,
      answers: {
        create: mock.questions.map((q) => ({ questionId: q.id, selectedOptionId: null })),
      },
    },
  })

  return NextResponse.json(attempt, { status: 201 })
}
