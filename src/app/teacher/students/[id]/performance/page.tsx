import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  getExamPerformance,
  getChapterPerformance,
  getWrongAnswers,
  getUnattemptedQuestions,
} from '@/lib/performance'
import { Button } from '@/components/ui/button'
import PerformanceTabs from '@/app/student/performance/PerformanceTabs'

export default async function StudentPerformancePage({ params }: { params: { id: string } }) {
  const teacher = await requireRole('TEACHER')

  const student = await db.user.findUnique({
    where: { id: params.id, createdBy: teacher.id, role: 'STUDENT' },
    select: { id: true, name: true, email: true },
  })

  if (!student) notFound()

  const [examPerf, chapterPerf, wrongAnswers, unattempted] = await Promise.all([
    getExamPerformance(student.id),
    getChapterPerformance(student.id),
    getWrongAnswers(student.id),
    getUnattemptedQuestions(student.id),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/teacher/students">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="text-muted-foreground text-sm">{student.email}</p>
        </div>
      </div>

      <PerformanceTabs
        examData={examPerf}
        chapterData={chapterPerf}
        wrongData={wrongAnswers}
        unattemptedData={unattempted}
        showResetButtons
      />
    </div>
  )
}
