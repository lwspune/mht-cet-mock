import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import type { Role, UserProfile } from '@/types'

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser(): Promise<UserProfile | null> {
  const session = await getSession()
  if (!session) return null

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  return user as UserProfile | null
}

// Page / layout helpers — redirect on failure
export async function requireAuth(): Promise<UserProfile> {
  const user = await getUser()
  if (!user) redirect('/login')
  return user
}

export async function requireRole(role: Role): Promise<UserProfile> {
  const user = await requireAuth()
  if (user.role !== role) {
    redirect(user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard')
  }
  return user
}

// API route helpers — return NextResponse on failure instead of redirecting
export async function apiAuth(): Promise<{ user: UserProfile } | { error: NextResponse }> {
  const user = await getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { user }
}

export async function apiRequireRole(
  role: Role
): Promise<{ user: UserProfile } | { error: NextResponse }> {
  const result = await apiAuth()
  if ('error' in result) return result
  if (result.user.role !== role) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return result
}
