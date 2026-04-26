import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function StudentDashboard() {
  const user = await requireRole('STUDENT')

  const [totalMocks, submitted, inProgress] = await Promise.all([
    db.mock.count({ where: { isPublished: true } }),
    db.mockAttempt.count({ where: { studentId: user.id, status: 'SUBMITTED' } }),
    db.mockAttempt.count({ where: { studentId: user.id, status: 'IN_PROGRESS' } }),
  ])

  const recentAttempts = await db.mockAttempt.findMany({
    where: { studentId: user.id, status: 'SUBMITTED' },
    include: { mock: { include: { subject: true } } },
    orderBy: { submittedAt: 'desc' },
    take: 5,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}</h1>
        <p className="text-muted-foreground mt-1">Ready for today&apos;s practice?</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Available Mocks</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{totalMocks}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-green-600">{submitted}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-yellow-600">{inProgress}</div></CardContent>
        </Card>
      </div>

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
