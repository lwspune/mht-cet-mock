import { requireRole } from '@/lib/auth'
import StudentNav from '@/components/layout/StudentNav'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('STUDENT')

  return (
    <div className="min-h-screen flex flex-col">
      <StudentNav name={user.name} email={user.email} />
      <main className="flex-1 container py-6">{children}</main>
    </div>
  )
}
