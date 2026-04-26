import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  apiRequireRole: vi.fn().mockResolvedValue({
    user: { id: 'teacher-1', role: 'TEACHER' },
  }),
}))

const dbMock = {
  mock: {
    findUnique: vi.fn(),
  },
  mockAttempt: {
    deleteMany: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({ db: dbMock }))

function deleteRequest(): NextRequest {
  return new NextRequest('http://localhost/api/mocks/mock-1/attempts', {
    method: 'DELETE',
  })
}

const routeParams = { params: { id: 'mock-1' } }

describe('DELETE /api/mocks/[id]/attempts', () => {
  let DELETE: (req: NextRequest, ctx: typeof routeParams) => Promise<Response>

  beforeAll(async () => {
    const mod = await import('../route')
    DELETE = mod.DELETE
  })

  beforeEach(() => {
    dbMock.mock.findUnique.mockResolvedValue({ id: 'mock-1', createdBy: 'teacher-1' })
    dbMock.mockAttempt.deleteMany.mockResolvedValue({ count: 3 })
  })

  it('returns 200 with count of deleted attempts', async () => {
    const res = await DELETE(deleteRequest(), routeParams)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ count: 3 })
  })

  it('calls deleteMany scoped to the mock', async () => {
    await DELETE(deleteRequest(), routeParams)
    expect(dbMock.mockAttempt.deleteMany).toHaveBeenCalledWith({
      where: { mockId: 'mock-1' },
    })
  })

  it('returns 404 when teacher does not own the mock', async () => {
    dbMock.mock.findUnique.mockResolvedValueOnce({ id: 'mock-1', createdBy: 'other-teacher' })
    const res = await DELETE(deleteRequest(), routeParams)
    expect(res.status).toBe(404)
  })

  it('returns 404 when mock does not exist', async () => {
    dbMock.mock.findUnique.mockResolvedValueOnce(null)
    const res = await DELETE(deleteRequest(), routeParams)
    expect(res.status).toBe(404)
  })
})
