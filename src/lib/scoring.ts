import type { PrismaClient } from '@prisma/client'

type ScoringTx = Pick<PrismaClient, 'mockAttempt' | 'attemptAnswer'>

/**
 * Recomputes isCorrect per AttemptAnswer and total score per MockAttempt
 * for all SUBMITTED attempts on a mock. Call inside a transaction after
 * updating Option.isCorrect so the tx sees the new values.
 *
 * Returns the number of attempts rescored.
 */
export async function rescoreSubmittedAttempts(mockId: string, tx: ScoringTx): Promise<number> {
  const attempts = await tx.mockAttempt.findMany({
    where: { mockId, status: 'SUBMITTED' },
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

  for (const attempt of attempts) {
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
        score += isCorrect ? attempt.mock.marksCorrect : -attempt.mock.marksWrong
      }
    }

    await Promise.all([
      ...answerUpdates.map((a) =>
        tx.attemptAnswer.update({ where: { id: a.id }, data: { isCorrect: a.isCorrect } })
      ),
      tx.mockAttempt.update({ where: { id: attempt.id }, data: { score, maxScore } }),
    ])
  }

  return attempts.length
}
