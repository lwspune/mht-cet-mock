import { NextRequest, NextResponse } from 'next/server'
import { apiRequireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { getSubjectFrequencies } from '@/lib/performance'

interface Params { params: { courseSlug: string } }

// GET /api/course/[courseSlug]/frequency — returns all chapter frequencies grouped by subject
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error

  const data = await getSubjectFrequencies(params.courseSlug)
  return NextResponse.json({ data })
}

// PUT /api/course/[courseSlug]/frequency/reset — recompute from PYQ question distribution
export async function PUT(_req: NextRequest, { params }: Params) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error

  const course = await db.course.findUnique({
    where: { slug: params.courseSlug },
    include: {
      subjectConfigs: {
        include: { subject: { include: { chapters: true } } },
      },
    },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const pyqCounts = await db.question.groupBy({
    by: ['chapterId'],
    where: { pyqYear: { not: null } },
    _count: { id: true },
  })
  const countByChapter = new Map(pyqCounts.map((r) => [r.chapterId, r._count.id]))

  for (const config of course.subjectConfigs) {
    const chapters = config.subject.chapters
    const subjectTotal = chapters.reduce((sum, ch) => sum + (countByChapter.get(ch.id) ?? 0), 0)
    if (subjectTotal === 0) continue

    for (const chapter of chapters) {
      const pct = ((countByChapter.get(chapter.id) ?? 0) / subjectTotal) * 100
      await db.chapterFrequency.upsert({
        where: { courseId_chapterId: { courseId: course.id, chapterId: chapter.id } },
        update: { pct },
        create: { courseId: course.id, chapterId: chapter.id, pct },
      })
    }
  }

  const data = await getSubjectFrequencies(params.courseSlug)
  return NextResponse.json({ data })
}
