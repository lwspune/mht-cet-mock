import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiRequireRole, apiAuth } from '@/lib/auth'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(3),
  subjectId: z.string(),
  durationMins: z.number().min(10).max(360),
  marksCorrect: z.number().min(0),
  marksWrong: z.number().min(0),
})

export async function GET(request: NextRequest) {
  const auth = await apiAuth()
  if ('error' in auth) return auth.error
  const { user } = auth

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')

  if (user.role === 'STUDENT') {
    const mocks = await db.mock.findMany({
      where: { isPublished: true, courseSlug: user.courseSlug, ...(subjectId ? { subjectId } : {}) },
      include: { subject: true, _count: { select: { questions: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(mocks)
  }

  const mocks = await db.mock.findMany({
    where: { createdBy: user.id, courseSlug: user.courseSlug, ...(subjectId ? { subjectId } : {}) },
    include: { subject: true, _count: { select: { questions: true, attempts: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(mocks)
}

export async function POST(request: NextRequest) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error
  const { user: teacher } = auth

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const allowedConfigs = await db.courseSubjectConfig.findMany({
    where: { course: { slug: teacher.courseSlug } },
    select: { subjectId: true },
  })
  const allowedSubjectIds = new Set(allowedConfigs.map((c) => c.subjectId))
  if (!allowedSubjectIds.has(parsed.data.subjectId)) {
    return NextResponse.json({ error: 'Subject does not belong to your course' }, { status: 400 })
  }

  const mock = await db.mock.create({
    data: { ...parsed.data, createdBy: teacher.id, courseSlug: teacher.courseSlug },
  })

  return NextResponse.json(mock, { status: 201 })
}
