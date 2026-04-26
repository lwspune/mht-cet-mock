import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDuration } from '@/lib/utils'
import PublishToggle from './PublishToggle'
import ImportMockButton from '@/components/teacher/ImportMockButton'
import DeleteMockButton from '@/components/teacher/DeleteMockButton'

export default async function TeacherMocksPage() {
  const teacher = await requireRole('TEACHER')

  const mocks = await db.mock.findMany({
    where: { createdBy: teacher.id },
    include: {
      subject: true,
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mock Tests</h1>
        <div className="flex items-center gap-2">
          <ImportMockButton />
          <Button asChild>
            <Link href="/teacher/mocks/new">+ Create Mock</Link>
          </Button>
        </div>
      </div>

      {mocks.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground mb-4">No mocks created yet.</p>
          <Button asChild>
            <Link href="/teacher/mocks/new">Create your first mock</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {mocks.map((mock) => (
            <div key={mock.id} className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{mock.title}</span>
                  <Badge variant={mock.isPublished ? 'success' : 'secondary'} className="flex-shrink-0">
                    {mock.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {mock.subject.name} · {mock._count.questions} questions ·{' '}
                  {formatDuration(mock.durationMins)} · {mock._count.attempts} attempt(s)
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <PublishToggle mockId={mock.id} isPublished={mock.isPublished} />
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/teacher/mocks/${mock.id}/edit`}>Edit</Link>
                </Button>
                <DeleteMockButton mockId={mock.id} mockTitle={mock.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
