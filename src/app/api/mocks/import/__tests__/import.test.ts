import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { ImportRequest, ImportResponse } from '@/lib/import-types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  apiRequireRole: vi.fn().mockResolvedValue({
    user: { id: 'test-teacher-id', role: 'TEACHER', courseSlug: 'mht-cet' },
  }),
}))

// Capture what gets written to the DB so we can assert on it
const createdMocks: unknown[] = []
const createdQuestions: unknown[] = []
const createdOptions: unknown[] = []

// $transaction now receives an array of Prisma operations (not a callback).
// The individual db.mock.create / createMany calls happen before $transaction is called,
// so we mock them directly on db and $transaction just resolves the array.
const mockTransaction = vi.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))

vi.mock('@/lib/db', () => ({
  db: {
    chapter: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'ch-em-ind', name: 'Electromagnetic Induction', subjectId: 'subj-physics', subject: { name: 'Physics' } },
        { id: 'ch-vectors', name: 'Vectors', subjectId: 'subj-maths', subject: { name: 'Maths' } },
        { id: 'ch-ionic', name: 'Ionic Equilibria', subjectId: 'subj-chemistry', subject: { name: 'Chemistry' } },
        { id: 'ch-mag-mat', name: 'Magnetic Materials', subjectId: 'subj-physics', subject: { name: 'Physics' } },
      ]),
    },
    courseSubjectConfig: {
      findMany: vi.fn().mockResolvedValue([
        { subjectId: 'subj-physics', subject: { name: 'Physics' } },
        { subjectId: 'subj-chemistry', subject: { name: 'Chemistry' } },
        { subjectId: 'subj-maths', subject: { name: 'Maths' } },
      ]),
    },
    mock: {
      create: vi.fn().mockImplementation(({ data }: { data: unknown }) => {
        createdMocks.push(data)
        return Promise.resolve(data)
      }),
    },
    question: {
      createMany: vi.fn().mockImplementation(({ data }: { data: unknown[] }) => {
        createdQuestions.push(...data)
        return Promise.resolve({ count: data.length })
      }),
    },
    option: {
      createMany: vi.fn().mockImplementation(({ data }: { data: unknown[] }) => {
        createdOptions.push(...data)
        return Promise.resolve({ count: data.length })
      }),
    },
    subtopic: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockImplementation(({ create }: { create: { chapterId: string; name: string } }) =>
        Promise.resolve({ id: `st-${create.name}`, chapterId: create.chapterId, name: create.name })
      ),
    },
    $transaction: mockTransaction,
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<ImportRequest['mocks'][0]['questions'][0]> = {}) {
  return {
    tempId: 'row_2',
    chapterName: 'Electromagnetic Induction',
    subtopicName: 'Self Inductance',
    resolvedSubjectKey: 'Physics',
    text: 'The self induction $L$ produced by solenoid',
    options: ['$L = N\\phi$', '$L = \\mu_0 N A \\ell$', '$L = \\frac{\\mu_0 N^2 A}{\\ell}$', '$L = \\frac{\\mu_0 N A}{\\ell}$'],
    correctIndex: 2,
    solution: 'Self-inductance formula derivation.',
    pyqYear: '2021',
    ...overrides,
  }
}

function makeBody(overrides: Partial<ImportRequest> = {}): ImportRequest {
  return {
    durationMins: 180,
    marksCorrect: 2,
    marksWrong: 0,
    mocks: [
      {
        title: 'MHT CET May 2024 — Physics',
        subjectKey: 'Physics',
        questions: [makeQuestion()],
      },
    ],
    ...overrides,
  }
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/mocks/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/mocks/import', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeAll(async () => {
    const mod = await import('../route')
    POST = mod.POST
  })

  beforeEach(() => {
    createdMocks.length = 0
    createdQuestions.length = 0
    createdOptions.length = 0
    mockTransaction.mockClear()
  })

  // ── validation ────────────────────────────────────────────────────────────

  it('returns 400 for unknown subjectKey', async () => {
    const body = makeBody({ mocks: [{ title: 'Biology Mock', subjectKey: 'Biology', questions: [makeQuestion()] }] })
    const res = await POST(postRequest(body))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/not found in course/i)
  })

  it('returns 400 when mocks array is empty', async () => {
    const res = await POST(postRequest({ ...makeBody(), mocks: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when questions array is empty', async () => {
    const body = makeBody({ mocks: [{ title: 'Test Mock', subjectKey: 'Physics', questions: [] }] })
    const res = await POST(postRequest(body))
    expect(res.status).toBe(400)
  })

  it('returns 400 when a question has fewer than 4 options', async () => {
    const body = makeBody({
      mocks: [{
        title: 'Test Mock', subjectKey: 'Physics',
        questions: [makeQuestion({ options: ['A', 'B', 'C'] })],
      }],
    })
    const res = await POST(postRequest(body))
    expect(res.status).toBe(400)
  })

  it('returns 400 when correctIndex is out of range', async () => {
    const body = makeBody({
      mocks: [{
        title: 'Test Mock', subjectKey: 'Physics',
        questions: [makeQuestion({ correctIndex: 4 })],
      }],
    })
    const res = await POST(postRequest(body))
    expect(res.status).toBe(400)
  })

  it('returns 400 when chapter cannot be resolved', async () => {
    const body = makeBody({
      mocks: [{
        title: 'Physics Mock', subjectKey: 'Physics',
        questions: [makeQuestion({ chapterName: 'Unknown Chapter That Does Not Exist' })],
      }],
    })
    const res = await POST(postRequest(body))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/could not resolve/i)
  })

  it('returns 400 when title is too short', async () => {
    const body = makeBody({ mocks: [{ title: 'AB', subjectKey: 'Physics', questions: [makeQuestion()] }] }) // 2 chars — below min(3)
    const res = await POST(postRequest(body))
    expect(res.status).toBe(400)
  })

  // ── happy path ────────────────────────────────────────────────────────────

  it('returns 201 and creates one mock for a valid payload', async () => {
    const res = await POST(postRequest(makeBody()))
    expect(res.status).toBe(201)
    const body = (await res.json()) as ImportResponse
    expect(body.mocks).toHaveLength(1)
    expect(body.mocks[0].title).toBe('MHT CET May 2024 — Physics')
    expect(body.mocks[0].questionCount).toBe(1)
  })

  it('creates one mock per subject when three subjects are provided', async () => {
    const threeSubjects: ImportRequest = {
      durationMins: 180,
      marksCorrect: 2,
      marksWrong: 0,
      mocks: [
        { title: 'Test — Physics', subjectKey: 'Physics', questions: [makeQuestion()] },
        {
          title: 'Test — Chemistry', subjectKey: 'Chemistry',
          questions: [makeQuestion({ chapterName: 'Ionic Equilibria', resolvedSubjectKey: 'Chemistry' })],
        },
        {
          title: 'Test — Maths', subjectKey: 'Maths',
          questions: [makeQuestion({ chapterName: 'Vectors', resolvedSubjectKey: 'Maths' })],
        },
      ],
    }
    const res = await POST(postRequest(threeSubjects))
    expect(res.status).toBe(201)
    const body = (await res.json()) as ImportResponse
    expect(body.mocks).toHaveLength(3)
    expect(mockTransaction).toHaveBeenCalledTimes(3)
  })

  it('writes the mock with correct subjectId, title, and marks', async () => {
    await POST(postRequest(makeBody()))
    expect(createdMocks).toHaveLength(1)
    const mock = createdMocks[0] as Record<string, unknown>
    expect(mock.title).toBe('MHT CET May 2024 — Physics')
    expect(mock.subjectId).toBe('subj-physics')
    expect(mock.marksCorrect).toBe(2)
    expect(mock.marksWrong).toBe(0)
    expect(mock.durationMins).toBe(180)
    expect(mock.createdBy).toBe('test-teacher-id')
  })

  it('writes exactly 4 options per question via createMany, one marked isCorrect', async () => {
    await POST(postRequest(makeBody()))
    expect(createdQuestions).toHaveLength(1)
    expect(createdOptions).toHaveLength(4)

    const correctOpts = (createdOptions as { text: string; isCorrect: boolean }[]).filter((o) => o.isCorrect)
    expect(correctOpts).toHaveLength(1)
    expect(correctOpts[0].text).toBe('$L = \\frac{\\mu_0 N^2 A}{\\ell}$') // index 2
  })

  it('sets isCorrect on the right option (correctIndex = 2 → third option)', async () => {
    await POST(postRequest(makeBody()))
    const opts = createdOptions as { isCorrect: boolean }[]
    expect(opts[0].isCorrect).toBe(false)
    expect(opts[1].isCorrect).toBe(false)
    expect(opts[2].isCorrect).toBe(true)
    expect(opts[3].isCorrect).toBe(false)
  })

  it('stores solution text on the question', async () => {
    await POST(postRequest(makeBody()))
    const q = createdQuestions[0] as Record<string, unknown>
    expect(q.solution).toBe('Self-inductance formula derivation.')
  })

  it('stores subtopicName on the question', async () => {
    await POST(postRequest(makeBody()))
    const q = createdQuestions[0] as Record<string, unknown>
    expect(q.subtopicName).toBe('Self Inductance')
  })

  it('stores null subtopicName when omitted', async () => {
    await POST(postRequest(makeBody({ mocks: [{ title: 'Test — Physics', subjectKey: 'Physics', questions: [makeQuestion({ subtopicName: null })] }] })))
    const q = createdQuestions[0] as Record<string, unknown>
    expect(q.subtopicName).toBeNull()
  })

  it('stores pyqYear on the question', async () => {
    await POST(postRequest(makeBody()))
    const q = createdQuestions[0] as Record<string, unknown>
    expect(q.pyqYear).toBe('2021')
  })

  it('stores null pyqYear when omitted', async () => {
    await POST(postRequest(makeBody({ mocks: [{ title: 'Test — Physics', subjectKey: 'Physics', questions: [makeQuestion({ pyqYear: null })] }] })))
    const q = createdQuestions[0] as Record<string, unknown>
    expect(q.pyqYear).toBeNull()
  })

  it('upserts a Subtopic row and links the question via subtopicId', async () => {
    await POST(postRequest(makeBody()))
    const q = createdQuestions[0] as { subtopicId: string | null; subtopicName: string | null }
    expect(q.subtopicName).toBe('Self Inductance')
    expect(q.subtopicId).toBe('st-Self Inductance')
  })

  it('persists null subtopicId when subtopicName is null', async () => {
    await POST(postRequest(makeBody({ mocks: [{ title: 'Test — Physics', subjectKey: 'Physics', questions: [makeQuestion({ subtopicName: null })] }] })))
    const q = createdQuestions[0] as { subtopicId: string | null }
    expect(q.subtopicId).toBeNull()
  })

  it('stores a contentHash on every imported question', async () => {
    const { computeContentHashFromOptions } = await import('@/lib/questions/hash')
    await POST(postRequest(makeBody()))
    const q = createdQuestions[0] as { text: string; contentHash: string }
    const fixture = makeQuestion()
    const expected = computeContentHashFromOptions({
      text: fixture.text,
      options: fixture.options.map((text, idx) => ({ text, isCorrect: idx === fixture.correctIndex })),
    })
    expect(q.contentHash).toBe(expected)
    expect(q.contentHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('assigns sequential orderIndex starting at 1', async () => {
    const twoQuestions = makeBody({
      mocks: [{
        title: 'Test — Physics', subjectKey: 'Physics',
        questions: [makeQuestion(), makeQuestion({ tempId: 'row_3', correctIndex: 0 })],
      }],
    })
    await POST(postRequest(twoQuestions))
    const q1 = createdQuestions[0] as Record<string, unknown>
    const q2 = createdQuestions[1] as Record<string, unknown>
    expect(q1.orderIndex).toBe(1)
    expect(q2.orderIndex).toBe(2)
  })

  it('resolves chapter by resolvedSubjectKey, not by mock subjectKey (cross-subject fix)', async () => {
    // A Chemistry mock with a question whose chapter is in Physics (cross-resolved)
    const body = makeBody({
      mocks: [{
        title: 'Test — Chemistry', subjectKey: 'Chemistry',
        questions: [makeQuestion({ chapterName: 'Magnetic Materials', resolvedSubjectKey: 'Physics' })],
      }],
    })
    const res = await POST(postRequest(body))
    expect(res.status).toBe(201)
    const q = createdQuestions[0] as Record<string, unknown>
    expect(q.chapterId).toBe('ch-mag-mat') // the Physics chapter id, not a Chemistry one
  })

  it('wraps each mock creation in a transaction', async () => {
    await POST(postRequest(makeBody()))
    expect(mockTransaction).toHaveBeenCalledOnce()
  })

  it('starts no transactions when a later mock fails chapter resolution (atomic validation)', async () => {
    // Mock 1 is valid; mock 2 has an unresolvable chapter.
    // Pre-validation must catch mock 2 before any transaction runs for mock 1.
    const body: ImportRequest = {
      durationMins: 180,
      marksCorrect: 2,
      marksWrong: 0,
      mocks: [
        { title: 'Test — Physics', subjectKey: 'Physics', questions: [makeQuestion()] },
        {
          title: 'Test — Chemistry', subjectKey: 'Chemistry',
          questions: [makeQuestion({ chapterName: 'Nonexistent Chapter', resolvedSubjectKey: 'Chemistry' })],
        },
      ],
    }
    const res = await POST(postRequest(body))
    expect(res.status).toBe(400)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns all mock results in input order when run in parallel', async () => {
    const body: ImportRequest = {
      durationMins: 180,
      marksCorrect: 2,
      marksWrong: 0,
      mocks: [
        { title: 'Test — Physics', subjectKey: 'Physics', questions: [makeQuestion()] },
        {
          title: 'Test — Chemistry', subjectKey: 'Chemistry',
          questions: [makeQuestion({ chapterName: 'Ionic Equilibria', resolvedSubjectKey: 'Chemistry' })],
        },
        {
          title: 'Test — Maths', subjectKey: 'Maths',
          questions: [makeQuestion({ chapterName: 'Vectors', resolvedSubjectKey: 'Maths' })],
        },
      ],
    }
    const res = await POST(postRequest(body))
    expect(res.status).toBe(201)
    const responseBody = (await res.json()) as ImportResponse
    expect(responseBody.mocks.map((m) => m.title)).toEqual([
      'Test — Physics',
      'Test — Chemistry',
      'Test — Maths',
    ])
  })

  it('returns 400 when teacher course has no matching subject (NDA teacher importing Physics)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { apiRequireRole } = (await import('@/lib/auth')) as any
    apiRequireRole.mockResolvedValueOnce({ user: { id: 'nda-teacher-id', role: 'TEACHER', courseSlug: 'nda' } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { db } = (await import('@/lib/db')) as any
    db.courseSubjectConfig.findMany.mockResolvedValueOnce([])
    const res = await POST(postRequest(makeBody()))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/not found in course/i)
  })

  it('writes courseSlug from teacher onto committed mock', async () => {
    await POST(postRequest(makeBody()))
    const mock = createdMocks[0] as Record<string, unknown>
    expect(mock.courseSlug).toBe('mht-cet')
  })
})
