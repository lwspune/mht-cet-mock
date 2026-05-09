import { db } from '@/lib/db'
import type {
  ExamPerformance,
  ChapterPerformance,
  WrongAnswer,
  UnattemptedQuestion,
  SubjectProjection,
  SubjectFrequency,
  Milestone,
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
          subtopic: true,
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
    subtopicName: a.question.subtopic?.name ?? null,
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

export async function getDashboardInsights(studentId: string): Promise<{
  subjectAccuracy: { subjectName: string; pct: number; total: number }[]
  weakChapters: { chapterName: string; subjectName: string; pct: number; total: number }[]
}> {
  const answers = await db.attemptAnswer.findMany({
    where: { attempt: { studentId, status: 'SUBMITTED' } },
    include: {
      question: {
        include: { chapter: { include: { subject: true } } },
      },
    },
  })

  if (answers.length === 0) return { subjectAccuracy: [], weakChapters: [] }

  const chapterMap = new Map<string, { chapterName: string; subjectName: string; correct: number; total: number }>()
  const subjectMap = new Map<string, { subjectName: string; correct: number; total: number }>()

  for (const a of answers) {
    const chapter = a.question.chapter
    const subject = chapter.subject

    if (!chapterMap.has(chapter.id)) {
      chapterMap.set(chapter.id, { chapterName: chapter.name, subjectName: subject.name, correct: 0, total: 0 })
    }
    const ch = chapterMap.get(chapter.id)!
    ch.total++
    if (a.isCorrect === true) ch.correct++

    if (!subjectMap.has(subject.id)) {
      subjectMap.set(subject.id, { subjectName: subject.name, correct: 0, total: 0 })
    }
    const sub = subjectMap.get(subject.id)!
    sub.total++
    if (a.isCorrect === true) sub.correct++
  }

  const subjectAccuracy = Array.from(subjectMap.values())
    .map(({ subjectName, correct, total }) => ({
      subjectName,
      pct: total > 0 ? Math.round((correct / total) * 100) : 0,
      total,
    }))
    .sort((a, b) => a.pct - b.pct)

  const weakChapters = Array.from(chapterMap.values())
    .map(({ chapterName, subjectName, correct, total }) => ({
      chapterName,
      subjectName,
      pct: total > 0 ? Math.round((correct / total) * 100) : 0,
      total,
    }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3)

  return { subjectAccuracy, weakChapters }
}

export async function getProjectedScores(
  studentId: string,
  courseSlug = 'mht-cet',
  mode: 'all' | 'recent' = 'all',
  recentN = 3,
): Promise<SubjectProjection[]> {
  const course = await db.course.findUnique({
    where: { slug: courseSlug },
    include: {
      subjectConfigs: {
        include: { subject: true },
        orderBy: { subject: { name: 'asc' } },
      },
      frequencies: {
        include: { chapter: { include: { subject: true } } },
      },
    },
  })

  if (!course) return []

  let recentIds: string[] | undefined
  if (mode === 'recent') {
    const sets = await Promise.all(
      course.subjectConfigs.map((config) =>
        db.mockAttempt.findMany({
          where: { studentId, status: 'SUBMITTED', mock: { subjectId: config.subjectId } },
          orderBy: { submittedAt: 'desc' },
          take: recentN,
          select: { id: true },
        }),
      ),
    )
    recentIds = sets.flat().map((a) => a.id)
  }

  const answers = await db.attemptAnswer.findMany({
    where: {
      attempt: {
        studentId,
        status: 'SUBMITTED',
        ...(recentIds !== undefined ? { id: { in: recentIds } } : {}),
      },
    },
    select: { isCorrect: true, selectedOptionId: true, question: { select: { chapterId: true } } },
  })

  const chapterStats = new Map<string, { correct: number; total: number }>()
  for (const a of answers) {
    const cid = a.question.chapterId
    if (!chapterStats.has(cid)) chapterStats.set(cid, { correct: 0, total: 0 })
    const s = chapterStats.get(cid)!
    s.total++
    if (a.isCorrect === true) s.correct++
  }

  return course.subjectConfigs.map((config) => {
    const subjectFreqs = course.frequencies.filter(
      (f) => f.chapter.subjectId === config.subjectId,
    )

    const breakdown = subjectFreqs.map((f) => {
      const marksAtStake = (f.pct / 100) * config.maxMarks
      const stats = chapterStats.get(f.chapterId)

      if (!stats || stats.total === 0) {
        return {
          chapterId: f.chapterId,
          chapterName: f.chapter.name,
          marksAtStake,
          projected: 0,
          accuracy: null,
          gap: marksAtStake,
        }
      }

      const accuracy = stats.correct / stats.total
      const projected = accuracy * marksAtStake
      return {
        chapterId: f.chapterId,
        chapterName: f.chapter.name,
        marksAtStake,
        projected,
        accuracy,
        gap: marksAtStake - projected,
      }
    })

    breakdown.sort((a, b) => b.gap - a.gap)

    const projectedTotal = breakdown.reduce((sum, c) => sum + c.projected, 0)

    return {
      subjectName: config.subject.name,
      maxMarks: config.maxMarks,
      projected: Math.round(projectedTotal * 10) / 10,
      milestones: config.milestones as unknown as Milestone[],
      breakdown,
    }
  })
}

export async function getSubjectFrequencies(courseSlug = 'mht-cet'): Promise<SubjectFrequency[]> {
  const course = await db.course.findUnique({
    where: { slug: courseSlug },
    include: {
      subjectConfigs: {
        include: {
          subject: {
            include: { chapters: { orderBy: { orderIndex: 'asc' } } },
          },
        },
        orderBy: { subject: { name: 'asc' } },
      },
      frequencies: true,
    },
  })

  if (!course) return []

  const freqMap = new Map(course.frequencies.map((f) => [f.chapterId, f.pct]))

  return course.subjectConfigs.map((config) => ({
    subjectName: config.subject.name,
    subjectId: config.subjectId,
    maxMarks: config.maxMarks,
    chapters: config.subject.chapters.map((ch) => {
      const pct = freqMap.get(ch.id) ?? 0
      return {
        chapterId: ch.id,
        chapterName: ch.name,
        pct,
        marksAtStake: (pct / 100) * config.maxMarks,
      }
    }),
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
          subtopic: true,
          options: true,
        },
      },
    },
    orderBy: { attempt: { submittedAt: 'desc' } },
  })

  return answers.map((a) => ({
    questionId: a.questionId,
    questionText: a.question.text,
    questionImageUrl: a.question.imageUrl,
    chapterName: a.question.chapter.name,
    subtopicName: a.question.subtopic?.name ?? null,
    subjectName: a.question.chapter.subject.name,
    solution: a.question.solution,
    options: a.question.options.map((o) => ({
      text: o.text,
      imageUrl: o.imageUrl,
      isCorrect: o.isCorrect,
    })),
  }))
}
