import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/utils'

const SUBJECT_COLORS: Record<string, string> = {
  Physics: 'bg-blue-100 text-blue-800',
  Chemistry: 'bg-green-100 text-green-800',
  Maths: 'bg-orange-100 text-orange-800',
}

export default async function MocksPage() {
  const user = await requireRole('STUDENT')

  const [configs, mocks, attempts] = await Promise.all([
    db.courseSubjectConfig.findMany({
      where: { course: { slug: user.courseSlug } },
      include: { subject: true },
      orderBy: { subject: { name: 'asc' } },
    }),
    db.mock.findMany({
      where: { isPublished: true, courseSlug: user.courseSlug },
      include: {
        subject: true,
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.mockAttempt.findMany({
      where: { studentId: user.id },
      select: { mockId: true, status: true, score: true, maxScore: true },
    }),
  ])
  const subjects = configs.map((c) => c.subject)

  const attemptMap = new Map(attempts.map((a) => [a.mockId, a]))

  const mocksBySubject = subjects.map((subject) => ({
    subject,
    mocks: mocks.filter((m) => m.subjectId === subject.id),
  }))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Mock Tests</h1>

      {mocksBySubject.map(({ subject, mocks: subjectMocks }) => (
        <section key={subject.id}>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SUBJECT_COLORS[subject.name] ?? 'bg-gray-100 text-gray-800'}`}>
              {subject.name}
            </span>
            <span className="text-muted-foreground text-sm font-normal">
              {subjectMocks.length} mock{subjectMocks.length !== 1 ? 's' : ''}
            </span>
          </h2>

          {subjectMocks.length === 0 ? (
            <p className="text-sm text-muted-foreground pl-1">No mocks published yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjectMocks.map((mock) => {
                const attempt = attemptMap.get(mock.id)
                const isSubmitted = attempt?.status === 'SUBMITTED'
                const isInProgress = attempt?.status === 'IN_PROGRESS'

                return (
                  <Card key={mock.id} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{mock.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {mock._count.questions} questions · {formatDuration(mock.durationMins)} · +{mock.marksCorrect} / −{mock.marksWrong}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      {isSubmitted && attempt && (
                        <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
                          <div>Completed · Score: {attempt.score?.toFixed(1)}/{attempt.maxScore?.toFixed(1)}</div>
                          {mock.allowReattempt && (
                            <div className="mt-0.5 text-green-700">Reattempt available</div>
                          )}
                        </div>
                      )}
                      {isInProgress && (
                        <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
                          In Progress — resume to continue
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button
                        asChild
                        size="sm"
                        variant={isSubmitted && !mock.allowReattempt ? 'outline' : 'default'}
                        className="w-full"
                      >
                        <Link href={`/student/mocks/${mock.id}`}>
                          {isSubmitted
                            ? mock.allowReattempt ? 'Reattempt' : 'View Mock'
                            : isInProgress ? 'Resume' : 'Start Mock'}
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
