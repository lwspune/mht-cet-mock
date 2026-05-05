import { describe, it, expect, vi, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  apiRequireRole: vi.fn().mockResolvedValue({
    user: { id: 'test-teacher-id', role: 'TEACHER', courseSlug: 'mht-cet' },
  }),
  apiAuth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    courseSubjectConfig: {
      findMany: vi.fn().mockResolvedValue([
        { subjectId: 'subj-physics' },
        { subjectId: 'subj-chemistry' },
        { subjectId: 'subj-maths' },
      ]),
    },
    mock: {
      create: vi.fn().mockResolvedValue({ id: 'mock-id', title: 'Test Mock', courseSlug: 'mht-cet' }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}))

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/mocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/mocks', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeAll(async () => {
    const mod = await import('../route')
    POST = mod.POST
  })

  it('returns 400 when subjectId does not belong to teacher course', async () => {
    const res = await POST(postRequest({
      title: 'Biology Mock',
      subjectId: 'subj-biology',
      durationMins: 60,
      marksCorrect: 2,
      marksWrong: 0,
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Subject does not belong to your course')
  })
})
