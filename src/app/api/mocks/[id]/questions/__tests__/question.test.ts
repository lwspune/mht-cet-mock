import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  apiRequireRole: vi.fn().mockResolvedValue({
    user: { id: 'teacher-1', role: 'TEACHER' },
  }),
}))

const mockQuestion = {
  id: 'q-1',
  mockId: 'mock-1',
  chapterId: 'ch-1',
  text: 'What is $x$?',
  imageUrl: null,
  marks: 2,
  negMarks: 0,
  orderIndex: 1,
  solution: null,
}

const mockOptions = [
  { id: 'opt-1', questionId: 'q-1', text: 'A', isCorrect: true, imageUrl: null },
  { id: 'opt-2', questionId: 'q-1', text: 'B', isCorrect: false, imageUrl: null },
  { id: 'opt-3', questionId: 'q-1', text: 'C', isCorrect: false, imageUrl: null },
  { id: 'opt-4', questionId: 'q-1', text: 'D', isCorrect: false, imageUrl: null },
]

const dbMock = {
  mock: {
    findUnique: vi.fn().mockResolvedValue({ id: 'mock-1', createdBy: 'teacher-1' }),
  },
  question: {
    findUnique: vi.fn().mockResolvedValue(mockQuestion),
    update: vi.fn().mockResolvedValue(mockQuestion),
    delete: vi.fn().mockResolvedValue(mockQuestion),
  },
  option: {
    update: vi.fn().mockImplementation(({ where, data }: { where: { id: string }; data: object }) =>
      Promise.resolve({ id: where.id, ...data })
    ),
  },
  mockAttempt: {
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
  },
  attemptAnswer: {
    update: vi.fn().mockResolvedValue({}),
  },
  $transaction: vi.fn().mockImplementation((arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof dbMock) => Promise<unknown>)(dbMock)
    }
    return Promise.all(arg as Promise<unknown>[])
  }),
}

vi.mock('@/lib/db', () => ({ db: dbMock }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePayload(overrides = {}) {
  return {
    chapterId: 'ch-1',
    text: 'Updated question $x$',
    marks: 2,
    negMarks: 0,
    options: mockOptions.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
    ...overrides,
  }
}

function patchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/mocks/mock-1/questions/q-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deleteRequest(): NextRequest {
  return new NextRequest('http://localhost/api/mocks/mock-1/questions/q-1', {
    method: 'DELETE',
  })
}

const routeParams = { params: { id: 'mock-1', questionId: 'q-1' } }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/mocks/[id]/questions/[questionId]', () => {
  let PATCH: (req: NextRequest, ctx: typeof routeParams) => Promise<Response>

  beforeAll(async () => {
    const mod = await import('../[questionId]/route')
    PATCH = mod.PATCH
  })

  beforeEach(() => {
    dbMock.$transaction.mockClear()
    dbMock.question.update.mockClear()
    dbMock.option.update.mockClear()
    dbMock.mockAttempt.findMany.mockResolvedValue([])
    dbMock.mockAttempt.update.mockClear()
    dbMock.attemptAnswer.update.mockClear()
    dbMock.question.findUnique.mockResolvedValue({ ...mockQuestion, options: mockOptions, chapter: { id: 'ch-1', name: 'Vectors' } })
  })

  it('returns 200 for a valid update', async () => {
    const res = await PATCH(patchRequest(makePayload()), routeParams)
    expect(res.status).toBe(200)
  })

  it('calls $transaction with question update + 4 option updates', async () => {
    await PATCH(patchRequest(makePayload()), routeParams)
    expect(dbMock.$transaction).toHaveBeenCalledOnce()
    expect(dbMock.question.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'q-1' },
    }))
    expect(dbMock.option.update).toHaveBeenCalledTimes(4)
  })

  it('returns 400 when options array is wrong length', async () => {
    const res = await PATCH(patchRequest(makePayload({ options: mockOptions.slice(0, 3) })), routeParams)
    expect(res.status).toBe(400)
  })

  it('returns 400 when text is empty', async () => {
    const res = await PATCH(patchRequest(makePayload({ text: '' })), routeParams)
    expect(res.status).toBe(400)
  })

  it('returns 404 when question does not belong to mock', async () => {
    dbMock.question.findUnique.mockResolvedValueOnce({ ...mockQuestion, mockId: 'other-mock' })
    const res = await PATCH(patchRequest(makePayload()), routeParams)
    expect(res.status).toBe(404)
  })

  it('returns 404 when teacher does not own the mock', async () => {
    dbMock.mock.findUnique.mockResolvedValueOnce({ id: 'mock-1', createdBy: 'other-teacher' })
    const res = await PATCH(patchRequest(makePayload()), routeParams)
    expect(res.status).toBe(404)
  })

  it('passes solution to db.question.update when provided', async () => {
    await PATCH(patchRequest(makePayload({ solution: 'Because $x = 1$' })), routeParams)
    expect(dbMock.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ solution: 'Because $x = 1$' }),
      })
    )
  })

  it('sets solution to null when omitted', async () => {
    await PATCH(patchRequest(makePayload()), routeParams)
    expect(dbMock.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ solution: null }),
      })
    )
  })

  it('passes pyqYear to db.question.update when provided', async () => {
    await PATCH(patchRequest(makePayload({ pyqYear: '2021' })), routeParams)
    expect(dbMock.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pyqYear: '2021' }),
      })
    )
  })

  it('sets pyqYear to null when omitted', async () => {
    await PATCH(patchRequest(makePayload()), routeParams)
    expect(dbMock.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pyqYear: null }),
      })
    )
  })

  it('passes difficulty to db.question.update when provided', async () => {
    await PATCH(patchRequest(makePayload({ difficulty: 'HARD' })), routeParams)
    expect(dbMock.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ difficulty: 'HARD' }),
      })
    )
  })

  it('defaults difficulty to MODERATE when omitted', async () => {
    await PATCH(patchRequest(makePayload()), routeParams)
    expect(dbMock.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ difficulty: 'MODERATE' }),
      })
    )
  })

  it('returns 400 when difficulty is not a valid enum value', async () => {
    const res = await PATCH(patchRequest(makePayload({ difficulty: 'INSANE' })), routeParams)
    expect(res.status).toBe(400)
  })

  it('returns rescoredAttempts count in response', async () => {
    dbMock.mockAttempt.findMany.mockResolvedValueOnce([
      {
        id: 'attempt-1',
        mock: { marksCorrect: 2, marksWrong: 0.5 },
        answers: [],
      },
    ])
    const res = await PATCH(patchRequest(makePayload()), routeParams)
    const json = await res.json()
    expect(json.rescoredAttempts).toBe(1)
  })

  it('updates AttemptAnswer.isCorrect to false when selected answer is now wrong', async () => {
    dbMock.mockAttempt.findMany.mockResolvedValueOnce([
      {
        id: 'attempt-1',
        mock: { marksCorrect: 2, marksWrong: 0.5 },
        answers: [
          {
            id: 'ans-1',
            selectedOptionId: 'opt-1',
            question: { marks: 2, negMarks: 0.5 },
            selectedOption: { isCorrect: false }, // opt-1 is now wrong
          },
        ],
      },
    ])
    await PATCH(patchRequest(makePayload()), routeParams)
    expect(dbMock.attemptAnswer.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ans-1' }, data: { isCorrect: false } })
    )
    expect(dbMock.mockAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'attempt-1' }, data: expect.objectContaining({ score: -0.5 }) })
    )
  })

  it('updates AttemptAnswer.isCorrect to true when selected answer is now correct', async () => {
    dbMock.mockAttempt.findMany.mockResolvedValueOnce([
      {
        id: 'attempt-1',
        mock: { marksCorrect: 2, marksWrong: 0.5 },
        answers: [
          {
            id: 'ans-1',
            selectedOptionId: 'opt-2',
            question: { marks: 2, negMarks: 0.5 },
            selectedOption: { isCorrect: true }, // opt-2 is now correct
          },
        ],
      },
    ])
    await PATCH(patchRequest(makePayload()), routeParams)
    expect(dbMock.attemptAnswer.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ans-1' }, data: { isCorrect: true } })
    )
    expect(dbMock.mockAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'attempt-1' }, data: expect.objectContaining({ score: 2 }) })
    )
  })

  it('leaves unattempted answers with isCorrect null and does not affect score', async () => {
    dbMock.mockAttempt.findMany.mockResolvedValueOnce([
      {
        id: 'attempt-1',
        mock: { marksCorrect: 2, marksWrong: 0.5 },
        answers: [
          {
            id: 'ans-1',
            selectedOptionId: null,
            question: { marks: 2, negMarks: 0.5 },
            selectedOption: null,
          },
        ],
      },
    ])
    await PATCH(patchRequest(makePayload()), routeParams)
    expect(dbMock.attemptAnswer.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ans-1' }, data: { isCorrect: null } })
    )
    expect(dbMock.mockAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'attempt-1' }, data: expect.objectContaining({ score: 0 }) })
    )
  })
})

describe('DELETE /api/mocks/[id]/questions/[questionId]', () => {
  let DELETE: (req: NextRequest, ctx: typeof routeParams) => Promise<Response>

  beforeAll(async () => {
    const mod = await import('../[questionId]/route')
    DELETE = mod.DELETE
  })

  beforeEach(() => {
    dbMock.question.delete.mockResolvedValue(mockQuestion)
    dbMock.mock.findUnique.mockResolvedValue({ id: 'mock-1', createdBy: 'teacher-1' })
    dbMock.question.findUnique.mockResolvedValue(mockQuestion)
  })

  it('returns 200 and success: true', async () => {
    const res = await DELETE(deleteRequest(), routeParams)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('calls question.delete with the correct id', async () => {
    await DELETE(deleteRequest(), routeParams)
    expect(dbMock.question.delete).toHaveBeenCalledWith({ where: { id: 'q-1' } })
  })

  it('returns 404 when teacher does not own the mock', async () => {
    dbMock.mock.findUnique.mockResolvedValueOnce({ id: 'mock-1', createdBy: 'other-teacher' })
    const res = await DELETE(deleteRequest(), routeParams)
    expect(res.status).toBe(404)
  })

  it('returns 409 when delete fails due to FK constraint', async () => {
    dbMock.question.delete.mockRejectedValueOnce(new Error('FK constraint'))
    const res = await DELETE(deleteRequest(), routeParams)
    expect(res.status).toBe(409)
  })
})
