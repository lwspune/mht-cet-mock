import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDuration } from '@/lib/utils'

export default async function MockDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole('STUDENT')

  const mock = await db.mock.findUnique({
    where: { id: params.id, isPublished: true },
    include: {
      subject: true,
      _count: { select: { questions: true } },
      questions: {
        include: { chapter: true },
        orderBy: { orderIndex: 'asc' },
      },
    },
  })

  if (!mock) notFound()

  const attempt = await db.mockAttempt.findUnique({
    where: { mockId_studentId: { mockId: mock.id, studentId: user.id } },
    include: { _count: { select: { answers: true } } },
  })

  const isSubmitted = attempt?.status === 'SUBMITTED'
  const isInProgress = attempt?.status === 'IN_PROGRESS'

  // Chapter breakdown
  const chapterMap = new Map<string, { name: string; count: number }>()
  for (const q of mock.questions) {
    const key = q.chapterId
    if (!chapterMap.has(key)) chapterMap.set(key, { name: q.chapter.name, count: 0 })
    chapterMap.get(key)!.count++
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Badge className="mb-2">{mock.subject.name}</Badge>
        <h1 className="text-2xl font-bold">{mock.title}</h1>
      </div>

      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { label: 'Questions', value: mock._count.questions },
          { label: 'Duration', value: formatDuration(mock.durationMins) },
          { label: 'Correct Marks', value: `+${mock.marksCorrect}` },
          { label: 'Negative', value: `-${mock.marksWrong}` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chapter breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-base">Chapter Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {Array.from(chapterMap.values()).map((ch) => (
              <div key={ch.name} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{ch.name}</span>
                <span className="font-medium">{ch.count} Q</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isSubmitted && attempt && (
        <div className="rounded-lg border bg-green-50 p-4 text-sm text-green-800">
          You have already submitted this mock. Score: {attempt.score?.toFixed(1)} / {attempt.maxScore?.toFixed(1)}
        </div>
      )}

      <div className="flex gap-3">
        {!isSubmitted && (
          <Button asChild size="lg" className="flex-1">
            <Link href={`/student/mocks/${mock.id}/attempt`}>
              {isInProgress ? 'Resume Exam' : 'Start Exam'}
            </Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/student/mocks">Back to Mocks</Link>
        </Button>
      </div>
    </div>
  )
}
