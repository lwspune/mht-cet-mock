import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.hoisted(() => ({ apiAuth: vi.fn() }))
vi.mock('@/lib/auth', () => authMock)

const baseAttempt = {
  studentId: 'student-1',
  mock: { createdBy: 'teacher-1' },
}

const baseAnswer = {
  questionId: 'q-1',
  selectedOptionId: 'opt-2',
  isCorrect: true,
  question: {
    text: 'What is $x$?',
    imageUrl: null,
    solution: 'Because $x = 1$',
    orderIndex: 1,
    chapter: { name: 'Kinematics', subject: { name: 'Physics' } },
    options: [
      { id: 'opt-1', text: 'Option A', imageUrl: null, isCorrect: false },
      { id: 'opt-2', text: 'Option B', imageUrl: null, isCorrect: true },
    ],
  },
}

const dbMock = {
  mockAttempt: { findUnique: vi.fn() },
  attemptAnswer: { findMany: vi.fn() },
}

vi.mock('@/lib/db', () => ({ db: dbMock }))

function getRequest(filter?: string): NextRequest {
  const url = filter
    ? `http://localhost/api/attempts/attempt-1/questions?filter=${filter}`
    : 'http://localhost/api/attempts/attempt-1/questions'
  return new NextRequest(url, { method: 'GET' })
}

const routeParams = { params: { id: 'attempt-1' } }

let GET: (req: NextRequest, ctx: typeof routeParams) => Promise<Response>

beforeAll(async () => {
  const mod = await import('../route')
  GET = mod.GET
})

beforeEach(() => {
  dbMock.mockAttempt.findUnique.mockResolvedValue(baseAttempt)
  dbMock.attemptAnswer.findMany.mockResolvedValue([baseAnswer])
})

describe('GET /api/attempts/[id]/questions — auth', () => {
  it('returns 401 when unauthenticated', async () => {
    authMock.apiAuth.mockResolvedValueOnce({
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    const res = await GET(getRequest('correct'), routeParams)
    expect(res.status).toBe(401)
  })

  it('returns 403 when student accesses another student\'s attempt', async () => {
    authMock.apiAuth.mockResolvedValue({ user: { id: 'other-student', role: 'STUDENT' } })
    const res = await GET(getRequest('correct'), routeParams)
    expect(res.status).toBe(403)
  })

  it('returns 404 when teacher accesses attempt on another teacher\'s mock', async () => {
    authMock.apiAuth.mockResolvedValue({ user: { id: 'other-teacher', role: 'TEACHER' } })
    const res = await GET(getRequest('correct'), routeParams)
    expect(res.status).toBe(404)
  })
})

describe('GET /api/attempts/[id]/questions — validation', () => {
  beforeEach(() => {
    authMock.apiAuth.mockResolvedValue({ user: { id: 'student-1', role: 'STUDENT' } })
  })

  it('returns 400 when filter param is missing', async () => {
    const res = await GET(getRequest(), routeParams)
    expect(res.status).toBe(400)
  })

  it('returns 400 when filter param is invalid', async () => {
    const res = await GET(getRequest('invalid'), routeParams)
    expect(res.status).toBe(400)
  })

  it('returns 404 when attempt does not exist', async () => {
    dbMock.mockAttempt.findUnique.mockResolvedValueOnce(null)
    const res = await GET(getRequest('correct'), routeParams)
    expect(res.status).toBe(404)
  })
})

describe('GET /api/attempts/[id]/questions — happy path', () => {
  beforeEach(() => {
    authMock.apiAuth.mockResolvedValue({ user: { id: 'student-1', role: 'STUDENT' } })
  })

  it('returns 200 with correctly shaped ReviewQuestion array', async () => {
    const res = await GET(getRequest('correct'), routeParams)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    const q = body.data[0]
    expect(q.questionId).toBe('q-1')
    expect(q.questionText).toBe('What is $x$?')
    expect(q.selectedOptionId).toBe('opt-2')
    expect(q.isCorrect).toBe(true)
    expect(q.solution).toBe('Because $x = 1$')
    expect(q.chapterName).toBe('Kinematics')
    expect(q.subjectName).toBe('Physics')
    expect(q.options).toHaveLength(2)
    expect(q.options[1].isAnswer).toBe(true)
  })

  it('queries DB with correct filter for wrong answers', async () => {
    await GET(getRequest('wrong'), routeParams)
    expect(dbMock.attemptAnswer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isCorrect: false }),
      })
    )
  })

  it('queries DB with selectedOptionId: null for unattempted', async () => {
    await GET(getRequest('unattempted'), routeParams)
    expect(dbMock.attemptAnswer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ selectedOptionId: null }),
      })
    )
  })
})
