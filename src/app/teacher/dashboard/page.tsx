import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function TeacherDashboard() {
  const teacher = await requireRole('TEACHER')

  const [students, mocks, submissions] = await Promise.all([
    db.user.count({ where: { createdBy: teacher.id } }),
    db.mock.count({ where: { createdBy: teacher.id } }),
    db.mockAttempt.count({
      where: { mock: { createdBy: teacher.id }, status: 'SUBMITTED' },
    }),
  ])

  const recentMocks = await db.mock.findMany({
    where: { createdBy: teacher.id },
    include: {
      subject: true,
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome, {teacher.name}</p>
      </div>

      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Students</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{students}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Mocks Created</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{mocks}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Submissions</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{submissions}</div></CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <Link href="/teacher/mocks/new">+ Create Mock</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/teacher/students">Manage Students</Link>
        </Button>
      </div>

      {recentMocks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Mocks</h2>
          <div className="space-y-2">
            {recentMocks.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.subject.name} · {m._count.questions} questions · {m._count.attempts} attempts
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {m.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/teacher/mocks/${m.id}/edit`}>Edit</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
