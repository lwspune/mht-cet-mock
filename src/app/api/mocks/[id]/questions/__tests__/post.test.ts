import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  apiRequireRole: vi.fn().mockResolvedValue({
    user: { id: 'teacher-1', role: 'TEACHER' },
  }),
}))

const dbMock = {
  mock: {
    findUnique: vi.fn().mockResolvedValue({ id: 'mock-1', createdBy: 'teacher-1' }),
  },
  question: {
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ id: 'q-new', ...data, options: [], chapter: { id: 'ch-1' } })
    ),
  },
}

vi.mock('@/lib/db', () => ({ db: dbMock }))

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/mocks/mock-1/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const routeParams = { params: { id: 'mock-1' } }

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    chapterId: 'ch-1',
    text: 'Q text $x$',
    marks: 2,
    negMarks: 0,
    options: [
      { text: 'A', isCorrect: true },
      { text: 'B', isCorrect: false },
      { text: 'C', isCorrect: false },
      { text: 'D', isCorrect: false },
    ],
    ...overrides,
  }
}

describe('POST /api/mocks/[id]/questions', () => {
  let POST: (req: NextRequest, ctx: typeof routeParams) => Promise<Response>

  beforeAll(async () => {
    const mod = await import('../route')
    POST = mod.POST
  })

  beforeEach(() => {
    dbMock.question.create.mockClear()
  })

  it('returns 201 for a valid create', async () => {
    const res = await POST(postRequest(makePayload()), routeParams)
    expect(res.status).toBe(201)
  })

  it('passes difficulty to db.question.create when provided', async () => {
    await POST(postRequest(makePayload({ difficulty: 'EASY' })), routeParams)
    expect(dbMock.question.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ difficulty: 'EASY' }),
      })
    )
  })

  it('defaults difficulty to MODERATE when omitted', async () => {
    await POST(postRequest(makePayload()), routeParams)
    expect(dbMock.question.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ difficulty: 'MODERATE' }),
      })
    )
  })

  it('returns 400 when difficulty is not a valid enum value', async () => {
    const res = await POST(postRequest(makePayload({ difficulty: 'INSANE' })), routeParams)
    expect(res.status).toBe(400)
  })

  it('returns 404 when teacher does not own the mock', async () => {
    dbMock.mock.findUnique.mockResolvedValueOnce({ id: 'mock-1', createdBy: 'other' })
    const res = await POST(postRequest(makePayload()), routeParams)
    expect(res.status).toBe(404)
  })

  it('returns 400 when options array is wrong length', async () => {
    const res = await POST(postRequest(makePayload({ options: [{ text: 'A', isCorrect: true }] })), routeParams)
    expect(res.status).toBe(400)
  })

  it('persists a contentHash computed from text and options', async () => {
    const { computeContentHashFromOptions } = await import('@/lib/questions/hash')
    const payload = makePayload()
    const expected = computeContentHashFromOptions({ text: payload.text, options: payload.options })
    await POST(postRequest(payload), routeParams)
    expect(dbMock.question.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ contentHash: expected }),
      })
    )
  })
})
