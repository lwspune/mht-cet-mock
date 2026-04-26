import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'

// Root redirects to role-based dashboard
export default async function RootPage() {
  const user = await getUser()

  if (!user) redirect('/login')
  if (user.role === 'TEACHER') redirect('/teacher/dashboard')
  redirect('/student/dashboard')
}
