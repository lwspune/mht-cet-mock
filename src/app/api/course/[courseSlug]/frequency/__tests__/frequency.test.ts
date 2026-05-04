import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  apiRequireRole: vi.fn().mockResolvedValue({ user: { id: 'teacher-1', role: 'TEACHER' } }),
}))

vi.mock('@/lib/performance', () => ({
  getSubjectFrequencies: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/db', () => ({
  db: {
    course: { findUnique: vi.fn() },
    chapter: { findUnique: vi.fn() },
    chapterFrequency: { upsert: vi.fn() },
    question: { groupBy: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import { apiRequireRole } from '@/lib/auth'
import { PATCH } from '../[chapterId]/route'

const mockCourse = vi.mocked(db.course.findUnique)
const mockChapter = vi.mocked(db.chapter.findUnique)
const mockUpsert = vi.mocked(db.chapterFrequency.upsert)
const mockAuth = vi.mocked(apiRequireRole)

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/course/mht-cet/frequency/ch-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const PARAMS = { params: { courseSlug: 'mht-cet', chapterId: 'ch-1' } }

describe('PATCH /api/course/[courseSlug]/frequency/[chapterId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCourse.mockResolvedValue({ id: 'course-1', slug: 'mht-cet' } as never)
    mockChapter.mockResolvedValue({ id: 'ch-1', name: 'Optics' } as never)
    mockUpsert.mockResolvedValue({ id: 'freq-1', courseId: 'course-1', chapterId: 'ch-1', pct: 5 } as never)
  })

  it('returns 401 when not authenticated as teacher', async () => {
    mockAuth.mockResolvedValueOnce({ error: new Response(null, { status: 401 }) } as never)
    const res = await PATCH(makeRequest({ pct: 5 }), PARAMS)
    expect(res.status).toBe(401)
  })

  it('returns 400 when pct is missing', async () => {
    const res = await PATCH(makeRequest({}), PARAMS)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/pct/)
  })

  it('returns 400 when pct is not a number', async () => {
    const res = await PATCH(makeRequest({ pct: 'lots' }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('returns 400 when pct > 100', async () => {
    const res = await PATCH(makeRequest({ pct: 101 }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('returns 400 when pct < 0', async () => {
    const res = await PATCH(makeRequest({ pct: -1 }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('returns 404 when course not found', async () => {
    mockCourse.mockResolvedValueOnce(null as never)
    const res = await PATCH(makeRequest({ pct: 5 }), PARAMS)
    expect(res.status).toBe(404)
  })

  it('returns 404 when chapter not found', async () => {
    mockChapter.mockResolvedValueOnce(null as never)
    const res = await PATCH(makeRequest({ pct: 5 }), PARAMS)
    expect(res.status).toBe(404)
  })

  it('upserts chapter frequency and returns data', async () => {
    const res = await PATCH(makeRequest({ pct: 7.5 }), PARAMS)
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { pct: 7.5 },
        create: expect.objectContaining({ pct: 7.5 }),
      }),
    )
    const body = await res.json()
    expect(body.data).toBeDefined()
  })

  it('accepts pct of 0', async () => {
    const res = await PATCH(makeRequest({ pct: 0 }), PARAMS)
    expect(res.status).toBe(200)
  })

  it('accepts pct of 100', async () => {
    const res = await PATCH(makeRequest({ pct: 100 }), PARAMS)
    expect(res.status).toBe(200)
  })
})
