import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import MockForm from '@/components/teacher/MockForm'

export default async function NewMockPage() {
  await requireRole('TEACHER')

  const subjects = await db.subject.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Create New Mock</h1>
      <Card>
        <CardHeader>
          <CardTitle>Mock Details</CardTitle>
          <CardDescription>
            Set up the mock test. You&apos;ll add questions in the next step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MockForm subjects={subjects} />
        </CardContent>
      </Card>
    </div>
  )
}
