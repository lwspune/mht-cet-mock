import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MockForm from '@/components/teacher/MockForm'
import QuestionEditor from '@/components/teacher/QuestionEditor'
import KatexRenderer from '@/components/math/KatexRenderer'

export default async function EditMockPage({ params }: { params: { id: string } }) {
  const teacher = await requireRole('TEACHER')

  const mock = await db.mock.findUnique({
    where: { id: params.id, createdBy: teacher.id },
    include: {
      subject: true,
      questions: {
        include: { options: true, chapter: { include: { subject: true } } },
        orderBy: { orderIndex: 'asc' },
      },
    },
  })

  if (!mock) notFound()

  const chapters = await db.chapter.findMany({
    include: { subject: true },
    orderBy: [{ subject: { name: 'asc' } }, { orderIndex: 'asc' }],
  })

  const subjects = await db.subject.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/teacher/mocks">← Back</Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{mock.title}</h1>
            <Badge variant={mock.isPublished ? 'success' : 'secondary'}>
              {mock.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{mock.subject.name} · {mock.questions.length} questions</p>
        </div>
      </div>

      {/* Mock settings */}
      <Card>
        <CardHeader><CardTitle className="text-base">Mock Settings</CardTitle></CardHeader>
        <CardContent>
          <MockForm
            subjects={subjects}
            mockId={mock.id}
            defaultValues={{
              title: mock.title,
              subjectId: mock.subjectId,
              durationMins: mock.durationMins,
              marksCorrect: mock.marksCorrect,
              marksWrong: mock.marksWrong,
            }}
          />
        </CardContent>
      </Card>

      {/* Existing questions */}
      {mock.questions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Questions ({mock.questions.length})</h2>
          <div className="space-y-2">
            {mock.questions.map((q, i) => (
              <div key={q.id} className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <span className="rounded bg-primary/10 text-primary text-xs font-semibold px-2 py-1 flex-shrink-0">
                    Q{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">
                      <KatexRenderer text={q.text} />
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground">{q.chapter.name}</span>
                      <span className="text-xs text-green-600">
                        ✓ {q.options.find((o) => o.isCorrect)?.text.slice(0, 40)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add question */}
      <Card>
        <CardHeader><CardTitle className="text-base">Add New Question</CardTitle></CardHeader>
        <CardContent>
          <QuestionEditor
            mockId={mock.id}
            chapters={chapters}
          />
        </CardContent>
      </Card>
    </div>
  )
}
