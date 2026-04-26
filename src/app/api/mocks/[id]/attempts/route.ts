import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiRequireRole } from '@/lib/auth'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error
  const { user: teacher } = auth

  const mock = await db.mock.findUnique({ where: { id: params.id } })
  if (!mock || mock.createdBy !== teacher.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { count } = await db.mockAttempt.deleteMany({ where: { mockId: params.id } })
  return NextResponse.json({ count })
}
