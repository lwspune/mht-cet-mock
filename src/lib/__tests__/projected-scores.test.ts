import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProjectedScores } from '../performance'

vi.mock('@/lib/db', () => ({
  db: {
    course: { findUnique: vi.fn() },
    attemptAnswer: { findMany: vi.fn() },
    mockAttempt: { findMany: vi.fn() },
  },
}))

import { db } from '@/lib/db'
const mockCourse = vi.mocked(db.course.findUnique)
const mockAnswers = vi.mocked(db.attemptAnswer.findMany)
const mockAttemptFindMany = vi.mocked(db.mockAttempt.findMany)

const MILESTONES = [
  { label: 'Cutoff', pct: 0.30 },
  { label: 'Merit',  pct: 0.50 },
  { label: 'Rank',   pct: 0.70 },
]

function makeCourse(subjectName: string, maxMarks: number, chapters: { id: string; name: string; pct: number }[]) {
  return {
    id: 'course-1',
    slug: 'mht-cet',
    name: 'MHT CET',
    subjectConfigs: [
      {
        courseId: 'course-1',
        subjectId: 'sub-1',
        maxMarks,
        marksPerQ: maxMarks === 100 ? 2 : 1,
        negMarkFraction: 0.25,
        milestones: MILESTONES,
        subject: { id: 'sub-1', name: subjectName },
      },
    ],
    frequencies: chapters.map((ch) => ({
      courseId: 'course-1',
      chapterId: ch.id,
      pct: ch.pct,
      chapter: {
        id: ch.id,
        name: ch.name,
        subjectId: 'sub-1',
        subject: { id: 'sub-1', name: subjectName },
      },
    })),
  }
}

function makeAnswer(chapterId: string, isCorrect: boolean | null) {
  return {
    isCorrect,
    selectedOptionId: isCorrect === null ? null : 'opt-1',
    question: { chapterId },
  }
}

describe('getProjectedScores', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when course not found', async () => {
    mockCourse.mockResolvedValue(null as never)
    mockAnswers.mockResolvedValue([] as never[])
    const result = await getProjectedScores('student-1')
    expect(result).toEqual([])
  })

  it('marks chapter as null accuracy when student has no answers for it', async () => {
    mockCourse.mockResolvedValue(
      makeCourse('Physics', 50, [{ id: 'ch-1', name: 'Optics', pct: 20 }]) as never,
    )
    mockAnswers.mockResolvedValue([] as never[])

    const result = await getProjectedScores('student-1')
    expect(result[0].breakdown[0].accuracy).toBeNull()
    expect(result[0].breakdown[0].projected).toBe(0)
    expect(result[0].breakdown[0].gap).toBeCloseTo(10) // 20% of 50 = 10
  })

  it('computes projected marks as accuracy × marksAtStake', async () => {
    mockCourse.mockResolvedValue(
      makeCourse('Physics', 50, [{ id: 'ch-1', name: 'Optics', pct: 20 }]) as never,
    )
    // 2 correct out of 4 total → 50% accuracy
    mockAnswers.mockResolvedValue([
      makeAnswer('ch-1', true),
      makeAnswer('ch-1', true),
      makeAnswer('ch-1', false),
      makeAnswer('ch-1', null),
    ] as never[])

    const result = await getProjectedScores('student-1')
    const ch = result[0].breakdown[0]
    expect(ch.accuracy).toBeCloseTo(0.5) // 2/4
    expect(ch.marksAtStake).toBeCloseTo(10) // 20% of 50
    expect(ch.projected).toBeCloseTo(5)   // 0.5 × 10
    expect(ch.gap).toBeCloseTo(5)
  })

  it('sums projected marks across chapters for subject total', async () => {
    mockCourse.mockResolvedValue(
      makeCourse('Physics', 50, [
        { id: 'ch-1', name: 'Optics', pct: 20 },  // 10 marks at stake
        { id: 'ch-2', name: 'Mechanics', pct: 30 }, // 15 marks at stake
      ]) as never,
    )
    // ch-1: 100% accuracy → 10 marks; ch-2: 0% accuracy → 0 marks
    mockAnswers.mockResolvedValue([
      makeAnswer('ch-1', true),
      makeAnswer('ch-2', false),
    ] as never[])

    const result = await getProjectedScores('student-1')
    expect(result[0].projected).toBeCloseTo(10)
  })

  it('sorts breakdown by gap descending (biggest opportunity first)', async () => {
    mockCourse.mockResolvedValue(
      makeCourse('Physics', 50, [
        { id: 'ch-1', name: 'Optics', pct: 20 },    // 10 at stake, 100% → gap 0
        { id: 'ch-2', name: 'Mechanics', pct: 30 },  // 15 at stake, not tested → gap 15
        { id: 'ch-3', name: 'Thermodynamics', pct: 10 }, // 5 at stake, not tested → gap 5
      ]) as never,
    )
    mockAnswers.mockResolvedValue([makeAnswer('ch-1', true)] as never[])

    const result = await getProjectedScores('student-1')
    const names = result[0].breakdown.map((b) => b.chapterName)
    expect(names[0]).toBe('Mechanics')   // gap 15 — largest
    expect(names[1]).toBe('Thermodynamics') // gap 5
    expect(names[2]).toBe('Optics')      // gap 0
  })

  it('passes milestones through from course config', async () => {
    mockCourse.mockResolvedValue(
      makeCourse('Maths', 100, [{ id: 'ch-1', name: 'Integration', pct: 10 }]) as never,
    )
    mockAnswers.mockResolvedValue([] as never[])

    const result = await getProjectedScores('student-1')
    expect(result[0].milestones).toEqual(MILESTONES)
  })

  it('does not count unattempted (null) as wrong in accuracy', async () => {
    mockCourse.mockResolvedValue(
      makeCourse('Physics', 50, [{ id: 'ch-1', name: 'Optics', pct: 100 }]) as never,
    )
    // 1 correct, 1 unattempted → accuracy should be 1/2 = 0.5 (unattempted counted in total)
    mockAnswers.mockResolvedValue([
      makeAnswer('ch-1', true),
      makeAnswer('ch-1', null),
    ] as never[])

    const result = await getProjectedScores('student-1')
    expect(result[0].breakdown[0].accuracy).toBeCloseTo(0.5)
  })
})

describe('getProjectedScores – recent mode', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries mockAttempt per subject with correct take and order', async () => {
    mockCourse.mockResolvedValue(
      makeCourse('Physics', 50, [{ id: 'ch-1', name: 'Optics', pct: 100 }]) as never,
    )
    mockAttemptFindMany.mockResolvedValue([] as never[])
    mockAnswers.mockResolvedValue([] as never[])

    await getProjectedScores('student-1', 'mht-cet', 'recent', 3)

    expect(mockAttemptFindMany).toHaveBeenCalledOnce()
    expect(mockAttemptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: 'student-1', status: 'SUBMITTED' }),
        orderBy: { submittedAt: 'desc' },
        take: 3,
      }),
    )
  })

  it('filters answers to the returned attempt IDs', async () => {
    mockCourse.mockResolvedValue(
      makeCourse('Physics', 50, [{ id: 'ch-1', name: 'Optics', pct: 100 }]) as never,
    )
    mockAttemptFindMany.mockResolvedValue([{ id: 'attempt-recent' }] as never[])
    mockAnswers.mockResolvedValue([makeAnswer('ch-1', true)] as never[])

    await getProjectedScores('student-1', 'mht-cet', 'recent', 3)

    expect(mockAnswers).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          attempt: expect.objectContaining({ id: { in: ['attempt-recent'] } }),
        }),
      }),
    )
  })

  it('computes accuracy from recent answers only', async () => {
    mockCourse.mockResolvedValue(
      makeCourse('Physics', 50, [{ id: 'ch-1', name: 'Optics', pct: 100 }]) as never,
    )
    mockAttemptFindMany.mockResolvedValue([{ id: 'attempt-1' }] as never[])
    // Recent attempt: 3 correct out of 3
    mockAnswers.mockResolvedValue([
      makeAnswer('ch-1', true),
      makeAnswer('ch-1', true),
      makeAnswer('ch-1', true),
    ] as never[])

    const result = await getProjectedScores('student-1', 'mht-cet', 'recent', 1)
    expect(result[0].breakdown[0].accuracy).toBeCloseTo(1)
    expect(result[0].projected).toBeCloseTo(50)
  })

  it('shows accuracy null for chapters not covered by recent attempts', async () => {
    mockCourse.mockResolvedValue(
      makeCourse('Physics', 50, [
        { id: 'ch-1', name: 'Optics', pct: 50 },
        { id: 'ch-2', name: 'Mechanics', pct: 50 },
      ]) as never,
    )
    mockAttemptFindMany.mockResolvedValue([{ id: 'attempt-1' }] as never[])
    // Only ch-1 appears in recent answers
    mockAnswers.mockResolvedValue([makeAnswer('ch-1', true)] as never[])

    const result = await getProjectedScores('student-1', 'mht-cet', 'recent', 1)
    const ch2 = result[0].breakdown.find((b) => b.chapterName === 'Mechanics')!
    expect(ch2.accuracy).toBeNull()
    expect(ch2.projected).toBe(0)
  })

  it('shows all chapters as not tested when no recent attempts exist', async () => {
    mockCourse.mockResolvedValue(
      makeCourse('Physics', 50, [{ id: 'ch-1', name: 'Optics', pct: 100 }]) as never,
    )
    mockAttemptFindMany.mockResolvedValue([] as never[])
    mockAnswers.mockResolvedValue([] as never[])

    const result = await getProjectedScores('student-1', 'mht-cet', 'recent', 3)
    expect(result[0].breakdown[0].accuracy).toBeNull()
    expect(result[0].projected).toBe(0)
  })

  it('does not call mockAttempt in all mode', async () => {
    mockCourse.mockResolvedValue(
      makeCourse('Physics', 50, [{ id: 'ch-1', name: 'Optics', pct: 100 }]) as never,
    )
    mockAnswers.mockResolvedValue([] as never[])

    await getProjectedScores('student-1', 'mht-cet', 'all')
    expect(mockAttemptFindMany).not.toHaveBeenCalled()
  })
})
