import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDashboardInsights } from '../performance'

vi.mock('@/lib/db', () => ({
  db: {
    attemptAnswer: { findMany: vi.fn() },
  },
}))

import { db } from '@/lib/db'
const mockFindMany = vi.mocked(db.attemptAnswer.findMany)

function makeAnswer(
  subjectId: string,
  subjectName: string,
  chapterId: string,
  chapterName: string,
  isCorrect: boolean | null,
) {
  return {
    isCorrect,
    question: {
      chapter: {
        id: chapterId,
        name: chapterName,
        subject: { id: subjectId, name: subjectName },
      },
    },
  }
}

describe('getDashboardInsights', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty arrays when student has no submitted answers', async () => {
    mockFindMany.mockResolvedValue([])
    const result = await getDashboardInsights('student-1')
    expect(result).toEqual({ subjectAccuracy: [], weakChapters: [] })
  })

  it('computes subject accuracy as correct / total', async () => {
    mockFindMany.mockResolvedValue([
      makeAnswer('s1', 'Physics', 'c1', 'Ch1', true),
      makeAnswer('s1', 'Physics', 'c1', 'Ch1', false),
      makeAnswer('s1', 'Physics', 'c1', 'Ch1', null),
      makeAnswer('s2', 'Chemistry', 'c2', 'Ch2', true),
      makeAnswer('s2', 'Chemistry', 'c2', 'Ch2', true),
    ] as never[])

    const { subjectAccuracy } = await getDashboardInsights('student-1')
    const physics = subjectAccuracy.find((s) => s.subjectName === 'Physics')
    const chemistry = subjectAccuracy.find((s) => s.subjectName === 'Chemistry')

    expect(physics?.pct).toBe(33) // 1/3 = 33.33 → 33
    expect(physics?.total).toBe(3)
    expect(chemistry?.pct).toBe(100) // 2/2
    expect(chemistry?.total).toBe(2)
  })

  it('sorts subject accuracy weakest first', async () => {
    mockFindMany.mockResolvedValue([
      makeAnswer('s1', 'Physics', 'c1', 'Ch1', true),   // 100%
      makeAnswer('s2', 'Chemistry', 'c2', 'Ch2', false), // 0%
    ] as never[])

    const { subjectAccuracy } = await getDashboardInsights('student-1')
    expect(subjectAccuracy[0].subjectName).toBe('Chemistry')
    expect(subjectAccuracy[1].subjectName).toBe('Physics')
  })

  it('returns top 3 weakest chapters sorted by accuracy ascending', async () => {
    mockFindMany.mockResolvedValue([
      makeAnswer('s1', 'Physics', 'c1', 'Optics', true),          // 100%
      makeAnswer('s1', 'Physics', 'c2', 'Mechanics', false),      // 0%
      makeAnswer('s2', 'Chemistry', 'c3', 'Organic', false),      // 0%
      makeAnswer('s2', 'Chemistry', 'c4', 'Inorganic', true),     // 100%
      makeAnswer('s1', 'Physics', 'c5', 'Thermodynamics', false), // 0%
    ] as never[])

    const { weakChapters } = await getDashboardInsights('student-1')
    expect(weakChapters).toHaveLength(3)
    expect(weakChapters.every((c) => c.pct === 0)).toBe(true)
    expect(weakChapters.map((c) => c.chapterName)).not.toContain('Optics')
    expect(weakChapters.map((c) => c.chapterName)).not.toContain('Inorganic')
  })

  it('computes pct as Math.round of correct/total * 100', async () => {
    mockFindMany.mockResolvedValue([
      makeAnswer('s1', 'Physics', 'c1', 'Ch1', true),
      makeAnswer('s1', 'Physics', 'c1', 'Ch1', true),
      makeAnswer('s1', 'Physics', 'c1', 'Ch1', false),
    ] as never[])

    const { weakChapters } = await getDashboardInsights('student-1')
    expect(weakChapters[0].pct).toBe(67) // 2/3 = 66.6 → 67
  })

  it('does not include chapters beyond top 3 weakest', async () => {
    const answers = ['c1', 'c2', 'c3', 'c4'].map((id) =>
      makeAnswer('s1', 'Physics', id, `Chapter ${id}`, false),
    )
    mockFindMany.mockResolvedValue(answers as never[])
    const { weakChapters } = await getDashboardInsights('student-1')
    expect(weakChapters).toHaveLength(3)
  })
})
