import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDuration } from '@/lib/utils'
import ReattemptButton from '@/components/student/ReattemptButton'

export default async function MockDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole('STUDENT')

  const mock = await db.mock.findUnique({
    where: { id: params.id, isPublished: true },
    include: {
      subject: true,
      _count: { select: { questions: true } },
    },
  })

  if (!mock) notFound()

  const attempt = await db.mockAttempt.findUnique({
    where: { mockId_studentId: { mockId: mock.id, studentId: user.id } },
    include: { _count: { select: { answers: true } } },
  })

  const isSubmitted = attempt?.status === 'SUBMITTED'
  const isInProgress = attempt?.status === 'IN_PROGRESS'

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

      {isSubmitted && attempt && (
        <div className="rounded-lg border bg-green-50 p-4 text-sm text-green-800">
          <span className="font-medium">Submitted</span> · Score:{' '}
          {attempt.score?.toFixed(1)} / {attempt.maxScore?.toFixed(1)}
          {mock.allowReattempt && (
            <span className="ml-2 text-xs text-green-700">· Reattempt available</span>
          )}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        {!isSubmitted && (
          <Button asChild size="lg" className="flex-1">
            <Link href={`/student/mocks/${mock.id}/attempt`}>
              {isInProgress ? 'Resume Exam' : 'Start Exam'}
            </Link>
          </Button>
        )}
        {isSubmitted && attempt && mock.allowReattempt && (
          <ReattemptButton
            attemptId={attempt.id}
            mockId={mock.id}
            previousScore={`${attempt.score?.toFixed(1)} / ${attempt.maxScore?.toFixed(1)}`}
          />
        )}
        <Button variant="outline" asChild>
          <Link href="/student/mocks">Back to Mocks</Link>
        </Button>
      </div>
    </div>
  )
}
