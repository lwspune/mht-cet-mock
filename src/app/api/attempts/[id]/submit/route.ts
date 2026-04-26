import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiRequireRole } from '@/lib/auth'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiRequireRole('STUDENT')
  if ('error' in auth) return auth.error
  const { user: student } = auth

  const attempt = await db.mockAttempt.findUnique({
    where: { id: params.id },
    include: {
      mock: { select: { marksCorrect: true, marksWrong: true } },
      answers: {
        include: {
          question: { select: { marks: true, negMarks: true } },
          selectedOption: { select: { isCorrect: true } },
        },
      },
    },
  })

  if (!attempt || attempt.studentId !== student.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (attempt.status === 'SUBMITTED') {
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
  }

  const { marksCorrect, marksWrong } = attempt.mock

  let score = 0
  let maxScore = 0
  const answerUpdates: { id: string; isCorrect: boolean | null }[] = []

  for (const ans of attempt.answers) {
    maxScore += ans.question.marks

    if (ans.selectedOptionId === null) {
      answerUpdates.push({ id: ans.id, isCorrect: null })
    } else {
      const isCorrect = ans.selectedOption?.isCorrect ?? false
      answerUpdates.push({ id: ans.id, isCorrect })
      score += isCorrect ? marksCorrect : -marksWrong
    }
  }

  await db.$transaction([
    ...answerUpdates.map((a) =>
      db.attemptAnswer.update({ where: { id: a.id }, data: { isCorrect: a.isCorrect } })
    ),
    db.mockAttempt.update({
      where: { id: params.id },
      data: { status: 'SUBMITTED', submittedAt: new Date(), score, maxScore },
    }),
  ])

  return NextResponse.json({ score, maxScore })
}
