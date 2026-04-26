import { requireRole } from '@/lib/auth'
import TeacherNav from '@/components/layout/TeacherNav'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('TEACHER')

  return (
    <div className="min-h-screen flex flex-col">
      <TeacherNav name={user.name} email={user.email} />
      <main className="flex-1 container py-6">{children}</main>
    </div>
  )
}
