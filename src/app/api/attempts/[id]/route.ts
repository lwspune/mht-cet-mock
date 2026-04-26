import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiAuth } from '@/lib/auth'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await apiAuth()
  if ('error' in auth) return auth.error
  const { user } = auth

  const attempt = await db.mockAttempt.findUnique({
    where: { id: params.id },
    include: { mock: { select: { createdBy: true, allowReattempt: true } } },
  })

  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.role === 'TEACHER') {
    if (attempt.mock.createdBy !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  } else {
    if (attempt.studentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!attempt.mock.allowReattempt) {
      return NextResponse.json({ error: 'Reattempt not allowed for this mock' }, { status: 403 })
    }
  }

  await db.mockAttempt.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
