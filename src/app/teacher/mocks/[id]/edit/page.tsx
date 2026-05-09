import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MockForm from '@/components/teacher/MockForm'
import QuestionEditor from '@/components/teacher/QuestionEditor'
import QuestionEditDialog from '@/components/teacher/QuestionEditDialog'
import ResetAttemptsButton from '@/components/teacher/ResetAttemptsButton'
import KatexRenderer from '@/components/math/KatexRenderer'

export default async function EditMockPage({ params }: { params: { id: string } }) {
  const teacher = await requireRole('TEACHER')

  const mock = await db.mock.findFirst({
    where: { id: params.id, createdBy: teacher.id, courseSlug: teacher.courseSlug },
    include: {
      subject: true,
      questions: {
        include: { options: true, chapter: { include: { subject: true } } },
        orderBy: { orderIndex: 'asc' },
      },
      _count: { select: { attempts: true } },
    },
  })

  if (!mock) notFound()

  const configs = await db.courseSubjectConfig.findMany({
    where: { course: { slug: teacher.courseSlug } },
    include: { subject: true },
    orderBy: { subject: { name: 'asc' } },
  })
  const subjects = configs.map((c) => c.subject)
  const subjectIds = configs.map((c) => c.subjectId)

  const chapters = await db.chapter.findMany({
    where: { subjectId: { in: subjectIds } },
    include: { subject: true },
    orderBy: [{ subject: { name: 'asc' } }, { orderIndex: 'asc' }],
  })

  const subtopics = await db.subtopic.findMany({
    where: { chapterId: { in: chapters.map((c) => c.id) } },
    select: { id: true, chapterId: true, name: true },
    orderBy: { name: 'asc' },
  })

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
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base">Mock Settings</CardTitle>
            <ResetAttemptsButton mockId={mock.id} attemptCount={mock._count.attempts} />
          </div>
        </CardHeader>
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
              allowReattempt: mock.allowReattempt,
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
                    <p className="text-sm">
                      <KatexRenderer text={q.text} />
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{q.chapter.name}</span>
                      {(() => {
                        const correct = q.options.find((o) => o.isCorrect)
                        return correct ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            ✓ <KatexRenderer text={correct.text} />
                          </span>
                        ) : null
                      })()}
                    </div>
                  </div>
                  <QuestionEditDialog
                    mockId={mock.id}
                    chapters={chapters}
                    subtopics={subtopics}
                    question={{
                      id: q.id,
                      text: q.text,
                      chapterId: q.chapterId,
                      imageUrl: q.imageUrl,
                      solution: q.solution,
                      pyqYear: q.pyqYear,
                      difficulty: q.difficulty,
                      subtopicId: q.subtopicId,
                      subtopicName: q.subtopicName,
                      marks: q.marks,
                      negMarks: q.negMarks,
                      options: q.options.map((o) => ({
                        id: o.id,
                        text: o.text,
                        imageUrl: o.imageUrl,
                        isCorrect: o.isCorrect,
                      })),
                    }}
                  />
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
            subtopics={subtopics}
          />
        </CardContent>
      </Card>
    </div>
  )
}
