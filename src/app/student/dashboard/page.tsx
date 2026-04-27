import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { getDashboardInsights } from '@/lib/performance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const SUBJECT_COLORS: Record<string, string> = {
  Physics: 'bg-blue-100 text-blue-800',
  Chemistry: 'bg-green-100 text-green-800',
  Maths: 'bg-orange-100 text-orange-800',
}

const SUBJECT_BAR: Record<string, string> = {
  Physics: 'bg-blue-500',
  Chemistry: 'bg-green-500',
  Maths: 'bg-orange-500',
}

function accuracyColor(pct: number) {
  if (pct < 40) return 'text-red-600'
  if (pct < 70) return 'text-amber-600'
  return 'text-green-600'
}

export default async function StudentDashboard() {
  const user = await requireRole('STUDENT')

  const [totalMocks, submitted, inProgress, insights, recentAttempts] = await Promise.all([
    db.mock.count({ where: { isPublished: true } }),
    db.mockAttempt.count({ where: { studentId: user.id, status: 'SUBMITTED' } }),
    db.mockAttempt.count({ where: { studentId: user.id, status: 'IN_PROGRESS' } }),
    getDashboardInsights(user.id),
    db.mockAttempt.findMany({
      where: { studentId: user.id, status: 'SUBMITTED' },
      include: { mock: { include: { subject: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 5,
    }),
  ])

  const hasInsights = insights.subjectAccuracy.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}</h1>
        <p className="text-muted-foreground mt-1">Ready for today&apos;s practice?</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-3">
        <Card>
          <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Available Mocks</CardTitle></CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0"><div className="text-2xl sm:text-3xl font-bold">{totalMocks}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Completed</CardTitle></CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0"><div className="text-2xl sm:text-3xl font-bold text-green-600">{submitted}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">In Progress</CardTitle></CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0"><div className="text-2xl sm:text-3xl font-bold text-yellow-600">{inProgress}</div></CardContent>
        </Card>
      </div>

      {/* Analytics — only shown after at least one submission */}
      {hasInsights && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Subject accuracy */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Subject Accuracy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.subjectAccuracy.map(({ subjectName, pct }) => (
                <div key={subjectName}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{subjectName}</span>
                    <span className={`font-semibold tabular-nums ${accuracyColor(pct)}`}>{pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${SUBJECT_BAR[subjectName] ?? 'bg-gray-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Weak chapters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Focus Areas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.weakChapters.map(({ chapterName, subjectName, pct }) => (
                <div key={chapterName} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{chapterName}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SUBJECT_COLORS[subjectName] ?? 'bg-gray-100 text-gray-800'}`}>
                      {subjectName}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums shrink-0 ${accuracyColor(pct)}`}>{pct}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/student/mocks">Browse Mock Tests</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/student/performance">View Performance</Link>
        </Button>
      </div>

      {/* Recent attempts */}
      {recentAttempts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Attempts</h2>
          <div className="space-y-2">
            {recentAttempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{a.mock.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.mock.subject.name} · {new Date(a.submittedAt!).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{a.score?.toFixed(1)} / {a.maxScore?.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
