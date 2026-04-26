import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/auth'
import { getChapterPerformance, getWrongAnswers, getUnattemptedQuestions } from '@/lib/performance'

export async function GET(request: NextRequest) {
  const auth = await apiAuth()
  if ('error' in auth) return auth.error
  const { user } = auth

  const { searchParams } = new URL(request.url)
  const studentId = user.role === 'TEACHER'
    ? (searchParams.get('studentId') ?? user.id)
    : user.id

  const type = searchParams.get('type') ?? 'chapters'

  if (type === 'wrong') return NextResponse.json(await getWrongAnswers(studentId))
  if (type === 'unattempted') return NextResponse.json(await getUnattemptedQuestions(studentId))

  return NextResponse.json(await getChapterPerformance(studentId))
}
