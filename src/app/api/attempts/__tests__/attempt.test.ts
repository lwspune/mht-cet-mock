import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.hoisted(() => ({ apiAuth: vi.fn() }))
vi.mock('@/lib/auth', () => authMock)

const baseAttempt = {
  id: 'attempt-1',
  mockId: 'mock-1',
  studentId: 'student-1',
  status: 'SUBMITTED',
  mock: { createdBy: 'teacher-1', allowReattempt: true },
}

const dbMock = {
  mockAttempt: {
    findUnique: vi.fn(),
    delete: vi.fn().mockResolvedValue(baseAttempt),
  },
}

vi.mock('@/lib/db', () => ({ db: dbMock }))

function deleteRequest(): NextRequest {
  return new NextRequest('http://localhost/api/attempts/attempt-1', {
    method: 'DELETE',
  })
}

const routeParams = { params: { id: 'attempt-1' } }

let DELETE: (req: NextRequest, ctx: typeof routeParams) => Promise<Response>

beforeAll(async () => {
  const mod = await import('../[id]/route')
  DELETE = mod.DELETE
})

// ── Teacher ───────────────────────────────────────────────────────────────────

describe('DELETE /api/attempts/[id] — teacher', () => {
  beforeEach(() => {
    authMock.apiAuth.mockResolvedValue({ user: { id: 'teacher-1', role: 'TEACHER' } })
    dbMock.mockAttempt.findUnique.mockResolvedValue(baseAttempt)
    dbMock.mockAttempt.delete.mockClear()
  })

  it('returns 200 and success: true', async () => {
    const res = await DELETE(deleteRequest(), routeParams)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('calls delete with the correct attempt id', async () => {
    await DELETE(deleteRequest(), routeParams)
    expect(dbMock.mockAttempt.delete).toHaveBeenCalledWith({ where: { id: 'attempt-1' } })
  })

  it('returns 404 when attempt belongs to a different teacher\'s mock', async () => {
    dbMock.mockAttempt.findUnique.mockResolvedValueOnce({
      ...baseAttempt,
      mock: { createdBy: 'other-teacher', allowReattempt: true },
    })
    const res = await DELETE(deleteRequest(), routeParams)
    expect(res.status).toBe(404)
  })

  it('returns 404 when attempt does not exist', async () => {
    dbMock.mockAttempt.findUnique.mockResolvedValueOnce(null)
    const res = await DELETE(deleteRequest(), routeParams)
    expect(res.status).toBe(404)
  })
})

// ── Student ───────────────────────────────────────────────────────────────────

describe('DELETE /api/attempts/[id] — student', () => {
  beforeEach(() => {
    authMock.apiAuth.mockResolvedValue({ user: { id: 'student-1', role: 'STUDENT' } })
    dbMock.mockAttempt.findUnique.mockResolvedValue(baseAttempt)
    dbMock.mockAttempt.delete.mockClear()
  })

  it('returns 200 when allowReattempt is true and attempt belongs to student', async () => {
    const res = await DELETE(deleteRequest(), routeParams)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('returns 403 when allowReattempt is false', async () => {
    dbMock.mockAttempt.findUnique.mockResolvedValueOnce({
      ...baseAttempt,
      mock: { createdBy: 'teacher-1', allowReattempt: false },
    })
    const res = await DELETE(deleteRequest(), routeParams)
    expect(res.status).toBe(403)
  })

  it('returns 403 when attempt belongs to a different student', async () => {
    dbMock.mockAttempt.findUnique.mockResolvedValueOnce({
      ...baseAttempt,
      studentId: 'other-student',
    })
    const res = await DELETE(deleteRequest(), routeParams)
    expect(res.status).toBe(403)
  })

  it('returns 404 when attempt does not exist', async () => {
    dbMock.mockAttempt.findUnique.mockResolvedValueOnce(null)
    const res = await DELETE(deleteRequest(), routeParams)
    expect(res.status).toBe(404)
  })
})
