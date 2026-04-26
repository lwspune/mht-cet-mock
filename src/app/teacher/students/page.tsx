import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import AddStudentDialog from '@/components/teacher/AddStudentDialog'

export default async function StudentsPage() {
  const teacher = await requireRole('TEACHER')

  const students = await db.user.findMany({
    where: { createdBy: teacher.id, role: 'STUDENT' },
    include: {
      _count: { select: { attempts: { where: { status: 'SUBMITTED' } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <AddStudentDialog />
      </div>

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No students added yet.</p>
            <AddStudentDialog />

          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Exams Taken</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Added On</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{student.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{student.email}</td>
                  <td className="px-4 py-3 text-right">{student._count.attempts}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {new Date(student.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/teacher/students/${student.id}/performance`}>View Performance</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

