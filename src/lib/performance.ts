import { db } from '@/lib/db'
import type {
  ExamPerformance,
  ChapterPerformance,
  WrongAnswer,
  UnattemptedQuestion,
} from '@/types'

export async function getExamPerformance(studentId: string): Promise<ExamPerformance[]> {
  const attempts = await db.mockAttempt.findMany({
    where: { studentId, status: 'SUBMITTED' },
    include: {
      mock: { include: { subject: true } },
      answers: true,
    },
    orderBy: { submittedAt: 'desc' },
  })

  return attempts.map((a) => {
    const correct = a.answers.filter((x) => x.isCorrect === true).length
    const wrong = a.answers.filter((x) => x.isCorrect === false && x.selectedOptionId !== null).length
    const unattempted = a.answers.filter((x) => x.selectedOptionId === null).length
    const attempted = correct + wrong

    return {
      attemptId: a.id,
      mockTitle: a.mock.title,
      subjectName: a.mock.subject.name,
      date: a.submittedAt!,
      score: a.score ?? 0,
      maxScore: a.maxScore ?? 0,
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
      attempted,
      correct,
      wrong,
      unattempted,
      durationMins: a.mock.durationMins,
    }
  })
}

export async function getChapterPerformance(studentId: string): Promise<ChapterPerformance[]> {
  const answers = await db.attemptAnswer.findMany({
    where: {
      attempt: { studentId, status: 'SUBMITTED' },
    },
    include: {
      question: {
        include: {
          chapter: { include: { subject: true } },
        },
      },
    },
  })

  const map = new Map<string, ChapterPerformance>()

  for (const a of answers) {
    const chapter = a.question.chapter
    const key = chapter.id

    if (!map.has(key)) {
      map.set(key, {
        chapterId: chapter.id,
        chapterName: chapter.name,
        subjectName: chapter.subject.name,
        correct: 0,
        wrong: 0,
        unattempted: 0,
        total: 0,
      })
    }

    const entry = map.get(key)!
    entry.total++

    if (a.isCorrect === true) entry.correct++
    else if (a.selectedOptionId !== null) entry.wrong++
    else entry.unattempted++
  }

  return Array.from(map.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName))
}

export async function getWrongAnswers(studentId: string): Promise<WrongAnswer[]> {
  const answers = await db.attemptAnswer.findMany({
    where: {
      attempt: { studentId, status: 'SUBMITTED' },
      isCorrect: false,
      selectedOptionId: { not: null },
    },
    include: {
      question: {
        include: {
          chapter: { include: { subject: true } },
          options: true,
        },
      },
      selectedOption: true,
    },
    orderBy: { attempt: { submittedAt: 'desc' } },
  })

  return answers.map((a) => ({
    questionId: a.questionId,
    questionText: a.question.text,
    questionImageUrl: a.question.imageUrl,
    chapterName: a.question.chapter.name,
    subtopicName: a.question.subtopicName,
    subjectName: a.question.chapter.subject.name,
    solution: a.question.solution,
    options: a.question.options.map((o) => ({
      text: o.text,
      imageUrl: o.imageUrl,
      isCorrect: o.isCorrect,
      isSelected: o.id === a.selectedOptionId,
    })),
    marks: a.question.marks,
    negMarks: a.question.negMarks,
  }))
}

export async function getUnattemptedQuestions(studentId: string): Promise<UnattemptedQuestion[]> {
  const answers = await db.attemptAnswer.findMany({
    where: {
      attempt: { studentId, status: 'SUBMITTED' },
      selectedOptionId: null,
    },
    include: {
      question: {
        include: {
          chapter: { include: { subject: true } },
        },
      },
      attempt: { include: { mock: true } },
    },
    orderBy: { attempt: { submittedAt: 'desc' } },
  })

  return answers.map((a) => ({
    questionId: a.questionId,
    questionText: a.question.text,
    questionImageUrl: a.question.imageUrl,
    chapterName: a.question.chapter.name,
    subjectName: a.question.chapter.subject.name,
    mockTitle: a.attempt.mock.title,
  }))
}
