import { NextRequest, NextResponse } from 'next/server'
import { apiRequireRole } from '@/lib/auth'
import { db } from '@/lib/db'

interface Params { params: { courseSlug: string; chapterId: string } }

// PATCH /api/course/[courseSlug]/frequency/[chapterId] — update a single chapter's pct
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  if (body === null || typeof body.pct !== 'number') {
    return NextResponse.json({ error: 'pct (number) is required' }, { status: 400 })
  }

  const pct = body.pct
  if (pct < 0 || pct > 100) {
    return NextResponse.json({ error: 'pct must be between 0 and 100' }, { status: 400 })
  }

  const course = await db.course.findUnique({ where: { slug: params.courseSlug } })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const chapter = await db.chapter.findUnique({ where: { id: params.chapterId } })
  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })

  const freq = await db.chapterFrequency.upsert({
    where: { courseId_chapterId: { courseId: course.id, chapterId: params.chapterId } },
    update: { pct },
    create: { courseId: course.id, chapterId: params.chapterId, pct },
  })

  return NextResponse.json({ data: freq })
}
