import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/auth'
import { getExamPerformance } from '@/lib/performance'

export async function GET(request: NextRequest) {
  const auth = await apiAuth()
  if ('error' in auth) return auth.error
  const { user } = auth

  const { searchParams } = new URL(request.url)
  const studentId = user.role === 'TEACHER'
    ? (searchParams.get('studentId') ?? user.id)
    : user.id

  const data = await getExamPerformance(studentId)
  return NextResponse.json(data)
}
