import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiAuth } from '@/lib/auth'
import type { ReviewFilter, ReviewQuestion } from '@/types'

const VALID_FILTERS: ReviewFilter[] = ['correct', 'wrong', 'unattempted']

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await apiAuth()
  if ('error' in auth) return auth.error
  const { user } = auth

  const filter = request.nextUrl.searchParams.get('filter') as ReviewFilter | null
  if (!filter || !VALID_FILTERS.includes(filter)) {
    return NextResponse.json(
      { error: 'filter must be one of: correct, wrong, unattempted' },
      { status: 400 }
    )
  }

  const attempt = await db.mockAttempt.findUnique({
    where: { id: params.id },
    select: { studentId: true, mock: { select: { createdBy: true } } },
  })

  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.role === 'TEACHER') {
    if (attempt.mock.createdBy !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  } else {
    if (attempt.studentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const answerWhere =
    filter === 'correct'
      ? { isCorrect: true }
      : filter === 'wrong'
      ? { isCorrect: false, selectedOptionId: { not: null as string | null } }
      : { selectedOptionId: null as string | null }

  const answers = await db.attemptAnswer.findMany({
    where: { attemptId: params.id, ...answerWhere },
    include: {
      question: {
        include: {
          options: true,
          chapter: { include: { subject: true } },
        },
      },
    },
    orderBy: { question: { orderIndex: 'asc' } },
  })

  const data: ReviewQuestion[] = answers.map((a) => ({
    questionId: a.questionId,
    questionText: a.question.text,
    questionImageUrl: a.question.imageUrl ?? null,
    selectedOptionId: a.selectedOptionId ?? null,
    isCorrect: a.isCorrect ?? null,
    chapterName: a.question.chapter.name,
    subjectName: a.question.chapter.subject.name,
    solution: a.question.solution ?? null,
    options: a.question.options.map((o) => ({
      id: o.id,
      text: o.text,
      imageUrl: o.imageUrl ?? null,
      isAnswer: o.isCorrect,
    })),
  }))

  return NextResponse.json({ data })
}
